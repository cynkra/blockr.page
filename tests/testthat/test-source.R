test_that("format_code keeps a short call on one line", {
  expect_identical(format_code(quote(x <- utils::head(data, 5))),
                   "x <- utils::head(data, 5)")
})

test_that("format_code puts the arguments of a long call on their own lines", {
  e <- quote(desc <- gtsummary::tbl_summary(ovi, by = "AREA", include = No..eggs.AEDES,
                                            type = No..eggs.AEDES ~ "continuous2"))
  expect_identical(
    format_code(e),
    paste(
      "desc <- gtsummary::tbl_summary(",
      "  ovi,",
      "  by = \"AREA\",",
      "  include = No..eggs.AEDES,",
      "  type = No..eggs.AEDES ~ \"continuous2\"",
      ")",
      sep = "\n"
    )
  )
})

test_that("local() wraps only a braced block", {
  expect_identical(wrap_block_expr(quote(f(x)), list(), "quoted"), quote(f(x)))
  expect_identical(wrap_block_expr(quote({ a <- 1; a }), list(), "quoted"),
                   quote(local({ a <- 1; a })))
})

brd <- new_page_board(
  blocks = c(a = blockr.core::new_dataset_block("iris"),
             b = blockr.core::new_head_block()),
  links = blockr.core::links(from = "a", to = "b", input = "data"),
  items = list(list(text = "# Iris"), list(block = "a"),
               list(text = "## Head"), list(block = "b"))
)
code <- c(a = "a <- datasets::iris", b = "b <- utils::head(a, 6L)")

test_that("a leading # heading becomes the YAML title", {
  pcs <- page_pieces(page_items(brd), brd, code, "qmd")
  expect_match(pcs[[1L]], "^---\ntitle: \"Iris\"")
  expect_identical(pcs[[3L]], "## Head")
  expect_identical(
    pcs[[2L]],
    paste("```{r}", "#| label: a", "#| echo: false", "a <- datasets::iris", "a", "```", sep = "\n")
  )
})

test_that("spin pieces comment the text and mark the chunks", {
  pcs <- page_pieces(page_items(brd), brd, code, "R")
  expect_identical(pcs[[3L]], "#' ## Head")
  expect_identical(pcs[[4L]], paste("#+ b, echo=FALSE", "b <- utils::head(a, 6L)", "b", sep = "\n"))
})

test_that("free_input follows the dock: first free named input, none when taken", {
  lnk <- data.frame(from = "a", to = "b", input = "data")
  blk <- blockr.core::new_head_block()
  expect_identical(free_input(blk, "b", lnk), NA_character_)
  expect_identical(free_input(blk, "c", lnk), "data")
})

test_that("the report's switches become chunk options", {
  expect_identical(chunk_vis_qmd(TRUE, TRUE), character())
  expect_identical(chunk_vis_qmd(FALSE, TRUE), "#| echo: false")
  expect_identical(chunk_vis_qmd(TRUE, FALSE), "#| output: false")
  expect_identical(chunk_vis_qmd(FALSE, FALSE), "#| include: false")
  expect_identical(chunk_vis_spin(FALSE, FALSE), ", include=FALSE")
})

test_that("a transform that feeds another block starts as a step", {
  b2 <- new_page_board(
    blocks = c(a = blockr.core::new_dataset_block("iris"),
               s = blockr.core::new_subset_block(),
               h = blockr.core::new_head_block()),
    links = blockr.core::links(from = c("a", "s"), to = c("s", "h"),
                               input = c("data", "data")),
    items = list(list(block = "a"), list(block = "s"),
                 list(block = "h"))
  )
  out <- vapply(page_items(b2), `[[`, logical(1L), "output")
  expect_identical(out, c(TRUE, FALSE, TRUE))
  b3 <- new_page_board(
    blocks = c(a = blockr.core::new_dataset_block("iris"),
               s = blockr.core::new_subset_block()),
    links = blockr.core::links(from = "a", to = "s", input = "data"),
    items = list(list(block = "a"), list(block = "s", output = FALSE, code = TRUE))
  )
  expect_identical(page_items(b3)[[2L]], list(block = "s", code = TRUE, output = FALSE))
})

