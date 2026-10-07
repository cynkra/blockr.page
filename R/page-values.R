#' Values a block reports, for the text
#'
#' What "@" offers in a page's text: the numbers a sentence would quote from a
#' block's result, each as the inline R that computes it. The text then shows
#' the value and keeps the code, so the number follows the block when it
#' changes.
#'
#' Methods cover data frames (rows, columns, column means), linear and
#' generalised linear models (coefficients or rate and odds ratios, their
#' intervals and p-values, the fit) and tests (`htest`). A package can add a
#' method for the results of its blocks.
#'
#' @param x A block's result.
#' @param name The name the text knows the result by: the block's id.
#' @param ... For methods.
#'
#' @return A list of values, each a list of `label` and `expr`.
#'
#' @examples
#' page_values(lm(mpg ~ wt, mtcars), "fit")[[1]]
#'
#' @export
page_values <- function(x, name, ...) {
  UseMethod("page_values")
}

#' @rdname page_values
#' @export
page_values.default <- function(x, name, ...) {
  if (is.atomic(x) && length(x) == 1L) {
    return(list(page_value("Value", name)))
  }
  list()
}

#' @rdname page_values
#' @export
page_values.data.frame <- function(x, name, ...) {
  out <- list(
    page_value("Rows", sprintf("nrow(%s)", name)),
    page_value("Columns", sprintf("ncol(%s)", name))
  )
  num <- names(x)[vapply(x, is.numeric, logical(1L))]
  for (col in utils::head(num, 30L)) {
    out <- c(out, list(page_value(
      paste("Mean of", col),
      sprintf("round(mean(%s, na.rm = TRUE), 2)", col_ref(name, col))
    )))
  }
  out
}

#' @rdname page_values
#' @export
page_values.lm <- function(x, name, ...) {

  glm <- inherits(x, "glm")
  link <- if (glm) x$family$link else "identity"
  ratio <- link %in% c("log", "logit")
  lab <- if (identical(link, "logit")) {
    "Odds ratio"
  } else if (ratio) {
    "Rate ratio"
  } else {
    "Coefficient"
  }
  tf <- function(e) if (ratio) sprintf("exp(%s)", e) else e
  ci <- if (glm) "confint.default" else "confint"

  # a factor's level reads "AREA: Non-intervention", not "AREANon-intervention"
  terms <- setdiff(names(stats::coef(x)), "(Intercept)")
  nice <- stats::setNames(terms, terms)
  for (v in names(x$xlevels)) {
    for (l in x$xlevels[[v]]) {
      k <- paste0(v, l)
      if (k %in% terms) nice[[k]] <- paste0(v, ": ", l)
    }
  }

  out <- list()
  for (k in terms) {
    q <- encodeString(k, quote = "\"")
    out <- c(out, list(
      page_value(
        paste0(lab, ", ", nice[[k]]),
        sprintf("round(%s, 2)", tf(sprintf("coef(%s)[[%s]]", name, q)))
      ),
      page_value(
        paste0("95% CI, ", nice[[k]]),
        sprintf("paste(round(%s, 2), collapse = \" to \")",
                tf(sprintf("%s(%s)[%s, ]", ci, name, q)))
      ),
      page_value(
        paste0("p-value, ", nice[[k]]),
        sprintf("format.pval(summary(%s)$coefficients[%s, 4], digits = 2, eps = 0.001)",
                name, q)
      )
    ))
  }

  out <- c(out, list(page_value("Observations", sprintf("nobs(%s)", name))))
  if (glm) {
    c(out, list(
      page_value("Residual deviance / df",
                 sprintf("round(deviance(%s) / df.residual(%s), 1)", name, name)),
      page_value("AIC", sprintf("round(AIC(%s), 1)", name))
    ))
  } else {
    c(out, list(
      page_value("R squared", sprintf("round(summary(%s)$r.squared, 2)", name))
    ))
  }
}

#' @rdname page_values
#' @export
page_values.htest <- function(x, name, ...) {
  out <- list()
  if (!is.null(x$estimate)) {
    nms <- names(x$estimate)
    for (i in seq_along(x$estimate)) {
      out <- c(out, list(page_value(
        if (is.null(nms)) "Estimate" else nms[i],
        sprintf("round(%s$estimate[[%d]], 2)", name, i)
      )))
    }
  }
  if (!is.null(x$conf.int)) {
    out <- c(out, list(page_value(
      "95% CI", sprintf("paste(round(%s$conf.int, 2), collapse = \" to \")", name)
    )))
  }
  if (!is.null(x$statistic)) {
    out <- c(out, list(page_value(
      if (is.null(names(x$statistic))) "Statistic" else names(x$statistic),
      sprintf("round(unname(%s$statistic), 2)", name)
    )))
  }
  if (!is.null(x$p.value)) {
    out <- c(out, list(page_value(
      "p-value", sprintf("format.pval(%s$p.value, digits = 2, eps = 0.001)", name)
    )))
  }
  out
}

page_value <- function(label, expr) {
  list(label = label, expr = expr)
}

col_ref <- function(name, col) {
  if (make.names(col) == col) {
    paste0(name, "$", col)
  } else {
    sprintf("%s[[%s]]", name, encodeString(col, quote = "\""))
  }
}

# Each value of a result with its current value as text, for the menu; one
# that does not compute is left out.
page_values_now <- function(res, name) {
  vals <- tryCatch(page_values(res, name), error = function(e) list())
  env <- list2env(stats::setNames(list(res), name), parent = globalenv())
  Filter(Negate(is.null), lapply(vals, function(v) {
    val <- tryCatch(eval(parse(text = v$expr)[[1L]], env), error = function(e) NULL)
    if (is.null(val) || !length(val)) {
      return(NULL)
    }
    txt <- paste(format(val, trim = TRUE), collapse = ", ")
    if (nchar(txt) > 40L) txt <- paste0(substr(txt, 1L, 39L), "…")
    list(label = v$label, expr = v$expr, value = txt)
  }))
}
