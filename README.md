# blockr.page

A blockr board shown as one document: blocks in reading order with text in
between, the board's graph in a gutter beside the text, and the contents on
the right. Adding a block in the document adds it to the board. The same page
can show its source beside it, as a Quarto document or an R script, and
render to HTML.

blockr.page builds on blockr.core and blockr.ui only. It does not use
blockr.dock.

## Try it

From a directory that holds the blockr checkouts:

```r
source("blockr.page/dev/page-aedes.R")   # the aedes board from blockr.stats
source("blockr.page/dev/page-core.R")    # blockr.core blocks only
```

The aedes demo needs glmmTMB, gtsummary, broom.helpers and ggplot2. Render
HTML needs quarto.

## A page board

```r
board <- new_page_board(
  blocks = c(cars = blockr.core::new_dataset_block("mtcars")),
  items = list(
    list(text = "# Fuel economy"),
    list(text = "Motor Trend road tests, 1974."),
    list(block = "cars")
  )
)
blockr.core::serve(board)
```

`items` is the reading order: blocks and markdown text. A block item takes the
report's two switches, `code` and `output`; a block with `output = FALSE` is a
step, shown as one line that opens to its settings.

`options(blockr.page.mode = "read")` serves the page read-only.

## Status

First prototype.
