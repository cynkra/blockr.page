#' Page board
#'
#' A board shown as one linear document. The board itself is the usual
#' blockr board, blocks and links; what the page adds is `items`, the reading
#' order: an ordered list in which each entry is either a block,
#' `list(block = "<id>", code = FALSE, output = TRUE)`, or a piece of markdown
#' text, `list(text = "...")`.
#'
#' A block's two switches are the report's: `output` shows its result in the
#' document, `code` shows its code. A block with `output = FALSE` is a step:
#' it prepares data for the blocks after it and shows as one line that opens
#' to its settings. Left out, `output` defaults to `FALSE` for a transform or
#' utility block that feeds another block, `TRUE` otherwise; `code` defaults to
#' `FALSE`.
#' A text item whose markdown starts with `#` is a heading: it shows in the
#' contents panel and starts a section that can be folded.
#'
#' Text belongs to the page, not to the board: it never enters the data flow.
#' Blocks missing from `items` are appended in board order, and items naming a
#' block the board does not have are dropped.
#'
#' @param blocks,links,stacks,options,ctor,pkg,class,... Passed to
#'   [blockr.core::new_board()].
#' @param items Reading order, see above. `NULL` lists the blocks in board
#'   order with no text.
#'
#' @return A board object inheriting from `page_board`.
#'
#' @examples
#' new_page_board(
#'   blocks = c(a = blockr.core::new_dataset_block("iris")),
#'   items = list(list(text = "# Iris"), list(block = "a"))
#' )
#'
#' @export
new_page_board <- function(blocks = list(), links = list(), stacks = list(),
                           items = NULL, ...,
                           options = blockr.core::default_board_options(),
                           ctor = NULL, pkg = NULL, class = character()) {

  blocks <- blockr.core::as_blocks(blocks)
  links <- blockr.core::as_links(links)

  blockr.core::new_board(
    blocks = blocks,
    links = links,
    stacks = stacks,
    items = as_page_items(items, names(blocks), output_defaults(blocks, links)),
    ...,
    options = options,
    ctor = blockr.core::forward_ctor(ctor),
    pkg = pkg,
    class = c(class, "page_board")
  )
}

#' @rdname new_page_board
#' @param x Object
#' @export
is_page_board <- function(x) {
  inherits(x, "page_board")
}

#' @rdname new_page_board
#' @export
page_items <- function(x) {
  stopifnot(is_page_board(x))
  x[["items"]]
}

# A transform or utility block that feeds another block starts as a step.
output_defaults <- function(blocks, links) {
  if (!length(blocks)) {
    return(logical())
  }
  cat <- blockr.core::block_metadata(blocks, "category")$category
  feeds <- names(blocks) %in% as.data.frame(links)$from
  stats::setNames(!(cat %in% c("transform", "utility") & feeds), names(blocks))
}

as_page_items <- function(items, block_ids, defaults = NULL) {

  if (is.null(items)) {
    items <- list()
  }

  items <- lapply(unclass(items), as_page_item)

  is_blk <- vapply(items, is_block_item, logical(1L))
  blk_ids <- vapply(items[is_blk], `[[`, character(1L), "block")

  keep <- !is_blk
  keep[is_blk] <- blk_ids %in% block_ids & !duplicated(blk_ids)

  items <- items[keep]

  missing <- setdiff(block_ids, blk_ids)

  items <- c(items, lapply(missing, function(id) list(block = id)))

  structure(lapply(items, block_item_flags, defaults), class = "page_items")
}

block_item_flags <- function(it, defaults = NULL) {
  if (!is_block_item(it)) {
    return(it)
  }
  out <- it$output
  if (is.null(out)) {
    out <- if (it$block %in% names(defaults)) defaults[[it$block]] else TRUE
  }
  list(block = it$block, code = isTRUE(it$code), output = isTRUE(out))
}

as_page_item <- function(x) {

  if (is.character(x) && length(x) == 1L) {
    return(list(text = x))
  }

  x <- as.list(x)

  if (is.character(x[["block"]]) && length(x[["block"]]) == 1L) {
    return(x[intersect(c("block", "code", "output"), names(x))])
  }

  if (is.character(x[["text"]]) && length(x[["text"]]) == 1L) {
    return(list(text = x[["text"]]))
  }

  stop(
    "A page item is `list(block = <id>)` or `list(text = <markdown>)`.",
    call. = FALSE
  )
}

is_block_item <- function(x) {
  !is.null(x[["block"]])
}

item_block_ids <- function(items) {
  unlist(lapply(items, `[[`, "block"), use.names = FALSE)
}

# Every block sits below the blocks it reads from. Returns the first link that
# the order breaks, as `c(from, to)`, or NULL when the order holds.
broken_link <- function(items, links) {

  pos <- match(links$from, item_block_ids(items))
  to <- match(links$to, item_block_ids(items))

  bad <- which(!is.na(pos) & !is.na(to) & pos > to)

  if (length(bad)) {
    c(links$from[bad[1L]], links$to[bad[1L]])
  } else {
    NULL
  }
}

#' @export
print.page_items <- function(x, ...) {
  cat("<page_items>", length(x), "item(s)\n")
  for (it in x) {
    if (is_block_item(it)) {
      cat("  [block]", it$block, "\n")
    } else {
      cat("  [text] ", substr(gsub("\n", " ", it$text), 1L, 60L), "\n")
    }
  }
  invisible(x)
}

#' @importFrom blockr.core blockr_ser
#' @exportS3Method blockr.core::blockr_ser
blockr_ser.page_items <- function(x, items = NULL, ...) {
  list(
    object = class(x),
    payload = unclass(if (is.null(items)) x else items)
  )
}

#' @importFrom blockr.core blockr_deser
#' @exportS3Method blockr.core::blockr_deser
blockr_deser.page_items <- function(x, data, ...) {
  structure(lapply(data[["payload"]], as_page_item), class = "page_items")
}

#' @importFrom blockr.core serialize_board
#' @exportS3Method blockr.core::serialize_board
serialize_board.page_board <- function(x, blocks, id = NULL, page_items = NULL,
                                       ...,
                                       session = blockr.core::get_session()) {

  # The live reading order sits in the page callback, not on the committed
  # board: put it there before core's method serializes the board.
  if (is.function(page_items)) {
    x[["items"]] <- as_page_items(
      shiny::isolate(page_items()),
      blockr.core::board_block_ids(x)
    )
  }

  core <- utils::getS3method("serialize_board", "board",
                             envir = asNamespace("blockr.core"))

  core(x, blocks, id, ..., session = session)
}
