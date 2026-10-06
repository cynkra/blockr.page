# Code as a person would write it: a call that fits stays on one line, a
# longer one puts each argument on its own line, a chain of `+` or a pipe
# breaks after the operator, a braced block indents its statements.
format_code <- function(x, indent = 0L, width = 76L) {

  dep <- deparse(x, width.cutoff = 500L)

  if (!is.call(x)) {
    return(paste(dep, collapse = " "))
  }

  # one line only when deparse itself gives one: a braced block never fits
  if (length(dep) == 1L && nchar(dep) + indent <= width) {
    return(dep)
  }

  fn <- x[[1L]]
  pad <- function(n) strrep(" ", n)
  name <- if (is.name(fn)) as.character(fn) else ""

  if (name %in% c("<-", "=") && length(x) == 3L) {
    return(paste0(deparse(x[[2L]]), " ", name, " ", format_code(x[[3L]], indent, width)))
  }

  if (identical(name, "{")) {
    body <- vapply(as.list(x)[-1L], format_code, character(1L),
                   indent = indent + 2L, width = width)
    return(paste0("{\n", paste0(pad(indent + 2L), body, collapse = "\n"), "\n", pad(indent), "}"))
  }

  if (identical(name, "~") && length(x) == 3L) {
    return(paste0(format_code(x[[2L]], indent, width), " ~ ",
                  format_code(x[[3L]], indent, width)))
  }

  if ((name %in% c("+", "|>") || grepl("^%.*%$", name)) && length(x) == 3L) {
    return(paste0(format_code(x[[2L]], indent, width), " ", name, "\n",
                  pad(indent + 2L), format_code(x[[3L]], indent + 2L, width)))
  }

  qualified <- is.call(fn) && identical(fn[[1L]], as.name("::"))
  plain <- nzchar(name) && grepl("^[A-Za-z.][A-Za-z0-9._]*$", name) &&
    !name %in% c("if", "for", "while", "repeat", "function")

  if (qualified || plain) {

    args <- as.list(x)[-1L]
    head <- paste(deparse(fn), collapse = "")

    # local({ ... }) keeps its brace on the call's line
    if (length(args) == 1L && is.call(args[[1L]]) &&
          identical(args[[1L]][[1L]], as.name("{"))) {
      return(paste0(head, "(", format_code(args[[1L]], indent, width), ")"))
    }

    nms <- names(args)
    if (is.null(nms)) nms <- character(length(args))

    parts <- vapply(
      seq_along(args),
      function(i) {
        val <- format_code(args[[i]], indent + 2L, width)
        if (nzchar(nms[i])) paste0(nms[i], " = ", val) else val
      },
      character(1L)
    )

    return(paste0(head, "(\n", paste0(pad(indent + 2L), parts, collapse = ",\n"),
                  "\n", pad(indent), ")"))
  }

  # deparse() indents by four; the rest of the code indents by two.
  lines <- deparse(x, width.cutoff = width - indent)
  lines <- vapply(
    lines,
    function(l) {
      lead <- attr(regexpr("^ *", l), "match.length")
      paste0(pad(lead %/% 2L), substring(l, lead + 1L))
    },
    character(1L),
    USE.NAMES = FALSE
  )
  paste(lines, collapse = paste0("\n", pad(indent)))
}
