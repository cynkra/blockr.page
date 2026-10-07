# The page as a document: each text item is markdown, each section a `##`
# heading, each block a chunk, and the page's title (the board's name) the
# title in the YAML header. The same pieces make the .qmd and the spin .R.

# One string of code per block, `id <- expr`, from the block servers'
# expressions through blockr.core's export_code(). Blocks not built yet are
# left out.
block_code <- function(exprs, board) {

  exprs <- Filter(Negate(is.null), exprs)

  if (!length(exprs)) {
    return(character())
  }

  ex <- blockr.core::export_code(exprs, board)
  ids <- names(ex$args)
  out <- character()

  for (i in seq_along(ids)) {
    e <- ex$exprs[[i]]
    if (is.null(e)) next
    w <- wrap_block_expr(e, ex$args[[i]], ex$types[[i]])
    out[ids[i]] <- format_code(call("<-", as.name(ids[i]), w))
  }

  out
}

# blockr.core's wrapping (bquote substitution, with() for quoted
# expressions), with local() kept only around a braced block, where it stops
# intermediate variables leaking. Around a single call it says nothing.
wrap_block_expr <- function(exprs, args, types) {

  if (identical(types, "bquoted") && length(args)) {
    exprs <- do.call(bquote, list(exprs, args))
  }

  if (length(args) && identical(types, "quoted")) {
    return(call("with", args, exprs))
  }

  if (is.call(exprs) && identical(exprs[[1L]], as.name("{"))) {
    call("local", exprs)
  } else {
    exprs
  }
}

# A chart block's picture is drawn in the browser; its expression returns the
# data it draws. Printing that would put a table where the chart was, so the
# chunk runs (later blocks read the result) and prints nothing.
browser_drawn <- function(blk) {
  inherits(blk, "chart_block")
}

# The report's two switches as chunk options: code and output both on needs
# nothing, output alone hides the code, code alone hides the result, neither
# keeps the chunk out of the document while it still runs.
chunk_vis_qmd <- function(code, output) {
  code <- isTRUE(code)
  if (output && code) character()
  else if (output) "#| echo: false"
  else if (code) "#| output: false"
  else "#| include: false"
}

chunk_vis_spin <- function(code, output) {
  code <- isTRUE(code)
  if (output && code) ""
  else if (output) ", echo=FALSE"
  else if (code) ", results=\"hide\", fig.show=\"hide\""
  else ", include=FALSE"
}

yaml_header <- function(title) {
  c(
    "---",
    if (!is.null(title)) paste0("title: \"", gsub("\"", "\\\\\"", title), "\""),
    "format:",
    "  html:",
    "    embed-resources: true",
    "df-print: paged",
    "execute:",
    "  warning: false",
    "  message: false",
    "---"
  )
}

# The document's head: the YAML header with the page's title, commented out
# for spin.
page_head <- function(title, fmt = "qmd") {
  head <- yaml_header(title)
  if (identical(fmt, "R")) head <- paste0("#' ", head)
  paste(head, collapse = "\n")
}

# The source of every item, in item order: a character string per item.
# `fmt` is "qmd" or "R".
page_pieces <- function(items, board, code, fmt = "qmd", prose = list()) {

  spin <- identical(fmt, "R")
  blks <- blockr.core::board_blocks(board)

  rem <- function(lines) if (spin) paste0("#' ", lines) else lines

  lapply(
    items,
    function(it) {
      if (is_section_item(it)) {
        return(rem(paste("##", it$section)))
      }
      if (!is_block_item(it)) {
        return(paste(rem(strsplit(it$text, "\n", fixed = TRUE)[[1L]]),
                     collapse = "\n"))
      }
      id <- it$block
      # text: its markdown, inline R and all, which the document evaluates
      if (id %in% names(prose)) {
        return(paste(rem(strsplit(prose[[id]], "\n", fixed = TRUE)[[1L]]),
                     collapse = "\n"))
      }
      body <- if (id %in% names(code)) code[[id]] else paste("#", id, "is not built yet")
      # a chart the browser draws prints nothing in the document
      out <- isTRUE(it$output) && !browser_drawn(blks[[id]])
      show <- if (out) id
      if (spin) {
        paste(c(paste0("#+ ", id, chunk_vis_spin(it$code, out)), body, show), collapse = "\n")
      } else {
        paste(c("```{r}", paste("#| label:", id), chunk_vis_qmd(it$code, out),
                body, show, "```"), collapse = "\n")
      }
    }
  )
}

page_document <- function(items, board, code, fmt = "qmd", title = NULL,
                          prose = list()) {
  pieces <- page_pieces(items, board, code, fmt, prose)
  paste0(paste(c(page_head(title, fmt), unlist(pieces)), collapse = "\n\n"), "\n")
}

page_file_stem <- function(title) {
  stem <- if (is.null(title)) "page" else tolower(gsub("[^A-Za-z0-9]+", "-", title))
  stem <- gsub("^-|-$", "", stem)
  if (nzchar(stem)) stem else "page"
}

# quarto renders the .qmd in a scratch directory; the HTML is
# self-contained (embed-resources).
render_page_html <- function(text, file) {

  dir <- tempfile("blockr-page-")
  dir.create(dir)
  on.exit(unlink(dir, recursive = TRUE), add = TRUE)

  qmd <- file.path(dir, "page.qmd")
  writeLines(text, qmd)

  out <- suppressWarnings(
    system2("quarto", c("render", shQuote(qmd), "--to", "html", "--quiet"),
            stdout = TRUE, stderr = TRUE)
  )

  html <- file.path(dir, "page.html")

  if (!file.exists(html)) {
    stop("quarto could not render the page:\n",
         paste(utils::tail(out, 15L), collapse = "\n"), call. = FALSE)
  }

  file.copy(html, file, overwrite = TRUE)
}
