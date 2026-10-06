test_that("items default to the blocks in board order", {
  brd <- new_page_board(
    blocks = c(a = blockr.core::new_dataset_block("iris"),
               b = blockr.core::new_head_block())
  )
  expect_identical(item_block_ids(page_items(brd)), c("a", "b"))
})

test_that("items drop unknown blocks and append missing ones", {
  brd <- new_page_board(
    blocks = c(a = blockr.core::new_dataset_block("iris"),
               b = blockr.core::new_head_block()),
    items = list("# Title", list(block = "zz"), list(block = "b"))
  )
  its <- page_items(brd)
  expect_identical(its[[1L]], list(text = "# Title"))
  expect_identical(item_block_ids(its), c("b", "a"))
})

test_that("a malformed item is an error", {
  expect_error(as_page_items(list(list(foo = 1)), character()), "page item")
})

test_that("broken_link finds a block above its input", {
  lnk <- data.frame(from = "a", to = "b")
  expect_null(broken_link(list(list(block = "a"), list(block = "b")), lnk))
  expect_identical(
    broken_link(list(list(block = "b"), list(text = "x"), list(block = "a")), lnk),
    c("a", "b")
  )
})

test_that("a page board survives serialization with its items", {
  brd <- new_page_board(
    blocks = c(a = blockr.core::new_dataset_block("iris"),
               b = blockr.core::new_head_block()),
    links = blockr.core::links(from = "a", to = "b", input = "data"),
    items = list(list(text = "# Iris"), list(block = "a"),
                 list(text = "Some text."), list(block = "b"))
  )
  back <- blockr.core::blockr_deser(blockr.core::blockr_ser(brd))
  expect_true(is_page_board(back))
  expect_identical(unclass(page_items(back)), unclass(page_items(brd)))
})
