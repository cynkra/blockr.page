# blockr.page with blockr.core blocks only (text is blockr.extra's prose
# block): no blockr.dock anywhere.
#
#   Rscript blockr.page/dev/page-core.R      (from /workspace)

root <- if (dir.exists("blockr.core")) "." else ".."

for (pkg in c("blockr.core", "blockr.ui", "blockr.extra", "blockr.page")) {
  pkgload::load_all(file.path(root, pkg), quiet = TRUE)
}

options(blockr.tabular_display = blockr.ui::html_table_display)

board <- new_page_board(
  blocks = c(
    cars = new_dataset_block("mtcars"),
    four = new_subset_block(subset = "cyl == 4"),
    top = new_head_block(n = 5L),
    plot = new_scatter_block(x = "wt", y = "mpg")
  ),
  links = c(
    new_link("cars", "four", "data"),
    new_link("four", "top", "data"),
    new_link("cars", "plot", "data")
  ),
  items = list(
    list(text = "# Fuel economy"),
    list(text = "Motor Trend road tests, 1974. 32 cars, 11 variables."),
    list(block = "cars"),
    list(section = "Four cylinders"),
    list(block = "four"),
    list(block = "top"),
    list(section = "Weight and mileage"),
    list(block = "plot"),
    list(text = "Heavier cars go fewer miles per gallon.")
  )
)

stopifnot(!"blockr.dock" %in% loadedNamespaces())

port <- if (exists("blockr_port")) blockr_port() else 3838L
message("blockr.page demo on http://127.0.0.1:", port)
shiny::runApp(serve(board, id = "page"), port = port, host = "0.0.0.0",
              launch.browser = FALSE)
