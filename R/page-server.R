#' @importFrom blockr.core board_server
#' @exportS3Method blockr.core::board_server
board_server.page_board <- function(id, x, ..., callbacks = list()) {

  if (is.function(callbacks)) {
    callbacks <- list(callbacks)
  }

  core <- utils::getS3method("board_server", "board",
                             envir = asNamespace("blockr.core"))

  # At the start, so what the callback returns (the live reading order) is in
  # the arguments every plugin receives, the save plugin included.
  core(
    id, x, ...,
    callbacks = c(list(page_callback), callbacks),
    callback_location = "start"
  )
}

# The page's own server: owns the reading order, keeps it in step with the
# board's blocks, and turns the document's gestures into board updates.
page_callback <- function(board, update, session, ...) {

  input <- session$input
  target <- session$ns("page")

  items <- shiny::reactiveVal(
    unclass(shiny::isolate(board$board)[["items"]])
  )

  # Where a block added from the document goes, by block id: the number of
  # items before it. Read once, when the block shows up on the board.
  pending <- new.env(parent = emptyenv())
  fresh <- shiny::reactiveVal(NULL)

  # The page's title is the board's name, a board option.
  title <- function() {
    val <- blockr.core::get_board_option_or_null("board_name", session)
    if (is.null(val) || !nzchar(val)) "Untitled page" else val
  }

  shiny::observeEvent(
    blockr.core::board_block_ids(board$board),
    {
      ids <- blockr.core::board_block_ids(board$board)
      cur <- shiny::isolate(items())

      cur <- Filter(function(it) !is_block_item(it) || it$block %in% ids, cur)

      for (id in setdiff(ids, item_block_ids(cur))) {
        at <- if (exists(id, pending)) pending[[id]] else length(cur)
        cur <- append(cur, list(list(block = id, code = FALSE, output = TRUE)),
                      after = min(at, length(cur)))
        if (exists(id, pending)) rm(list = id, envir = pending)
      }

      if (!identical(cur, shiny::isolate(items()))) {
        items(cur)
      }
    }
  )

  shiny::observe(
    {
      session$sendCustomMessage(
        "blockr-page",
        c(
          list(target = target, fresh = fresh(), name = title()),
          page_state(items(), board$board)
        )
      )
    }
  )

  toast <- function(msg) {
    session$sendCustomMessage(
      "blockr-page-toast",
      list(target = target, msg = msg)
    )
  }

  # A new order, unless it puts a block above one it reads from.
  reorder <- function(new) {
    bad <- broken_link(new, link_frame(board$board))
    if (is.null(bad)) {
      items(new)
    } else {
      nms <- block_names(board$board, bad)
      toast(paste0(nms[2L], " reads from ", nms[1L], ", so it stays below it."))
    }
  }

  shiny::observeEvent(
    input$page_action,
    {
      if (page_read_only()) return()
      act <- input$page_action
      cur <- items()
      n <- length(cur)

      switch(
        act$type,

        add_block = {
          blk <- page_new_block(act$registry)
          bid <- blockr.core::rand_names(blockr.core::board_block_ids(board$board))
          upd <- list(
            blocks = list(add = blockr.core::as_blocks(stats::setNames(list(blk), bid)))
          )
          if (length(act$from) && nzchar(act$from)) {
            inp <- free_input(blk, bid, link_frame(board$board, input = TRUE))
            if (!is.na(inp)) {
              upd$links <- list(
                add = blockr.core::links(from = act$from, to = bid, input = inp)
              )
            }
          }
          pending[[bid]] <- as.integer(act$at)
          fresh(bid)
          update(upd)
        },

        # "/" on an empty line of a text: the text splits there, the new
        # block (or a section) goes between the halves, and an empty half
        # goes. `before` and `after` are the halves as markdown.
        insert_in_text = {
          i <- as.integer(act$index) + 1L
          if (i > n || !is_block_item(cur[[i]])) return()
          tid <- cur[[i]]$block
          srv <- board$blocks[[tid]]$server
          before <- if (is.null(act$before)) "" else act$before
          after <- if (is.null(act$after)) "" else act$after
          keep <- nzchar(trimws(before))
          if (keep) srv$state$text(before)
          taken <- blockr.core::board_block_ids(board$board)
          rest <- NULL
          if (nzchar(trimws(after))) {
            rid <- blockr.core::rand_names(taken)
            taken <- c(taken, rid)
            rest <- stats::setNames(
              list(blockr.extra::new_prose_block(after, block_name = "Text")),
              rid
            )
          }
          # items before the new one: up to the text, or in its place
          at <- if (keep) i else i - 1L
          if (isTRUE(act$section)) {
            # a section is an item only; the rest of the text follows it
            if (!keep) cur <- cur[-i]
            cur <- append(cur, list(list(section = "")), after = at)
            items(cur)
            upd <- list()
            if (length(rest)) {
              pending[[names(rest)]] <- at + 1L
              upd$blocks$add <- blockr.core::as_blocks(rest)
            }
            if (!keep) upd$blocks$rm <- tid
            if (length(upd)) update(upd)
            return()
          }
          blk <- page_new_block(act$registry)
          bid <- blockr.core::rand_names(taken)
          upd <- list(blocks = list(
            add = blockr.core::as_blocks(c(stats::setNames(list(blk), bid), rest))
          ))
          if (!keep) upd$blocks$rm <- tid
          if (length(act$from) && nzchar(act$from)) {
            inp <- free_input(blk, bid, link_frame(board$board, input = TRUE))
            if (!is.na(inp)) {
              upd$links <- list(
                add = blockr.core::links(from = act$from, to = bid, input = inp)
              )
            }
          }
          pending[[bid]] <- at
          if (length(rest)) pending[[names(rest)]] <- at + 1L
          fresh(bid)
          update(upd)
        },

        connect = {
          brd <- board$board
          tgt <- blockr.core::board_blocks(brd)[[act$to]]
          lnk <- link_frame(brd, input = TRUE)
          pos <- match(c(act$from, act$to), item_block_ids(cur))
          inp <- if (is.null(tgt)) NA_character_ else free_input(tgt, act$to, lnk)
          nms <- block_names(brd, c(act$from, act$to))
          if (anyNA(pos) || pos[1L] > pos[2L]) {
            toast(paste0(nms[2L], " sits above ", nms[1L], ", so it cannot read from it."))
          } else if (is.na(inp)) {
            toast(paste0("All inputs of ", nms[2L], " are taken."))
          } else {
            update(list(links = list(
              add = blockr.core::links(from = act$from, to = act$to, input = inp)
            )))
          }
        },

        toggle = {
          i <- as.integer(act$index) + 1L
          f <- act$field
          if (i <= n && is_block_item(cur[[i]]) && f %in% c("code", "output")) {
            cur[[i]][[f]] <- !isTRUE(cur[[i]][[f]])
            items(cur)
          }
        },

        add_text = {
          items(append(cur, list(list(text = act$text)), after = as.integer(act$at)))
        },

        add_section = {
          items(append(cur, list(list(section = act$text)), after = as.integer(act$at)))
        },

        # a text that is one heading line becomes a section; an empty text or
        # section goes
        edit_text = {
          i <- as.integer(act$index) + 1L
          if (i <= n && !is_block_item(cur[[i]])) {
            txt <- trimws(act$text)
            if (!nzchar(txt)) {
              cur <- cur[-i]
            } else if (is_section_item(cur[[i]])) {
              cur[[i]] <- list(section = sub("^#+ *", "", txt))
            } else {
              cur[[i]] <- as_page_item(list(text = act$text))
            }
            items(cur)
          }
        },

        rename = {
          nm <- trimws(act$name)
          if (nzchar(nm)) {
            blockr.core::set_board_option_value("board_name", nm, board$board, session)
          }
        },

        move = {
          i <- as.integer(act$index) + 1L
          j <- i + as.integer(act$dir)
          if (i >= 1L && j >= 1L && i <= n && j <= n) {
            new <- cur
            new[c(i, j)] <- cur[c(j, i)]
            reorder(new)
          }
        },

        # dragged by its grip: item `index` goes into the gap before item
        # `at` (`at` = n for the end), both 0-based
        move_to = {
          i <- as.integer(act$index) + 1L
          at <- as.integer(act$at) + 1L
          if (i >= 1L && i <= n && at >= 1L && at <= n + 1L &&
                at != i && at != i + 1L) {
            after <- if (at > i) at - 2L else at - 1L
            reorder(append(cur[-i], cur[i], after = after))
          }
        },

        remove = {
          i <- as.integer(act$index) + 1L
          if (i <= n) {
            if (is_block_item(cur[[i]])) {
              update(list(blocks = list(rm = cur[[i]]$block)))
            } else {
              items(cur[-i])
            }
          }
        }
      )
    }
  )

  # Text that names a block reads from it. A prose block's code (the
  # expressions its editor reports as you type) is matched against the blocks
  # above it: each one named gets a link, input named after the block, so the
  # name resolves; a link to a block no longer named goes.
  shiny::observe(
    {
      brd <- board$board
      its <- items()
      blks <- blockr.core::board_blocks(brd)
      # a block just removed is still in the order until it catches up
      ids <- intersect(item_block_ids(its), names(blks))
      lnk <- as.data.frame(blockr.core::board_links(brd))
      add <- NULL
      rm <- character()
      for (id in ids[vapply(blks[ids], is_prose_block, logical(1L))]) {
        exprs <- unlist(input[[paste0("block_", id, "-expr-prose_exprs")]])
        above <- ids[seq_len(match(id, ids) - 1L)]
        named <- intersect(expr_names(exprs), above)
        have <- lnk[lnk$to == id, , drop = FALSE]
        new <- setdiff(named, have$from)
        if (length(new)) {
          add <- c(add, list(blockr.core::links(from = new, to = rep(id, length(new)),
                                                input = new)))
        }
        rm <- c(rm, have$id[!have$from %in% named])
      }
      if (length(add) || length(rm)) {
        upd <- list()
        if (length(add)) upd$add <- do.call(c, add)
        if (length(rm)) upd$rm <- rm
        update(list(links = upd))
      }
    }
  )

  # What a prose block's code can name: the blocks above it, with their
  # columns, offered to its editor for completion.
  shiny::observe(
    {
      brd <- board$board
      its <- items()
      blks <- blockr.core::board_blocks(brd)
      # a block just removed is still in the order until it catches up
      ids <- intersect(item_block_ids(its), names(blks))
      for (id in ids[vapply(blks[ids], is_prose_block, logical(1L))]) {
        above <- ids[seq_len(match(id, ids) - 1L)]
        above <- above[!vapply(blks[above], is_prose_block, logical(1L))]
        objects <- lapply(above, function(b) {
          res <- tryCatch(board$blocks[[b]]$server$result(), error = function(e) NULL)
          cols <- if (is.data.frame(res)) colnames(res) else names(res)
          list(name = blockr.core::block_name(blks[[b]]), cols = as.list(cols))
        })
        names(objects) <- above
        session$sendCustomMessage(
          "prose-offer",
          list(id = session$ns(paste0("block_", id, "-expr-editor")), objects = objects)
        )
      }
    }
  )

  # A block with its Code switch on shows its code above its result, as the
  # document will. Sent on its own, so editing a block's settings updates the
  # code without redrawing the page.
  shiny::observe(
    {
      blks <- Filter(is_block_item, items())
      shown <- unlist(lapply(blks, function(it) if (isTRUE(it$code)) it$block))
      if (!length(shown)) return()
      code <- live_block_code(board)
      session$sendCustomMessage(
        "blockr-page-code",
        list(
          target = target,
          code = as.list(code[intersect(shown, names(code))])
        )
      )
    }
  )

  # The source column, computed only while it is shown.
  shiny::observe(
    {
      src <- input$page_source
      if (!isTRUE(src$on)) return()
      fmt <- if (identical(src$fmt, "R")) "R" else "qmd"
      code <- live_block_code(board)
      prose <- live_prose_text(board)
      session$sendCustomMessage(
        "blockr-page-source",
        list(
          target = target,
          fmt = fmt,
          stem = page_file_stem(title()),
          head = page_head(title(), fmt),
          pieces = page_pieces(items(), board$board, code, fmt, prose)
        )
      )
    }
  )

  source_text <- function(fmt) {
    shiny::isolate(
      page_document(items(), board$board, live_block_code(board), fmt, title(),
                    live_prose_text(board))
    )
  }

  session$output$page_dl <- shiny::downloadHandler(
    filename = function() {
      fmt <- if (identical(input$page_source$fmt, "R")) "R" else "qmd"
      paste0(page_file_stem(shiny::isolate(title())), ".", fmt)
    },
    content = function(file) {
      fmt <- if (identical(input$page_source$fmt, "R")) "R" else "qmd"
      writeLines(source_text(fmt), file)
    }
  )

  session$output$page_html <- shiny::downloadHandler(
    filename = function() paste0(page_file_stem(shiny::isolate(title())), ".html"),
    content = function(file) {
      tryCatch(
        render_page_html(source_text("qmd"), file),
        error = function(e) {
          toast("The document did not render. The message is in the R console.")
          message(conditionMessage(e))
          stop(e)
        }
      )
    }
  )

  list(page_items = items)
}

# Block code from the live block servers. Each block's expression is a
# reactive; a block not built yet has none.
live_block_code <- function(board) {
  exprs <- lapply(
    board$blocks,
    function(b) tryCatch(b$server$expr(), error = function(e) NULL)
  )
  block_code(exprs, board$board)
}

# The committed text of every prose block, by block id.
live_prose_text <- function(board) {
  prose <- Filter(function(b) is_prose_block(b$block), board$blocks)
  lapply(prose, function(b) tryCatch(b$server$state$text(), error = function(e) ""))
}

# The names an R expression uses, for any that do not parse none.
expr_names <- function(exprs) {
  unique(unlist(lapply(exprs, function(e) {
    tryCatch(all.names(parse(text = e, keep.source = FALSE)[[1L]]),
             error = function(err) character())
  })))
}

# The input a new link lands on, as blockr.dock picks it: the first free named
# input, an unnamed slot for a variadic block, NA when there is none.
free_input <- function(blk, id, links) {
  used <- links$input[links$to == id]
  free <- setdiff(blockr.core::block_inputs(blk), used)
  if (is.na(blockr.core::block_arity(blk))) {
    free <- c(free, "")
  }
  if (length(free)) free[1L] else NA_character_
}

# A block for the page's menus: a text is a prose block named "Text".
page_new_block <- function(registry) {
  if (identical(registry, "new_prose_block")) {
    blockr.extra::new_prose_block(block_name = "Text")
  } else {
    blockr.core::create_block(registry)
  }
}

page_state <- function(items, board) {

  blks <- blockr.core::board_blocks(board)

  list(
    items = lapply(
      items,
      function(it) {
        if (is_block_item(it)) {
          list(block = it$block, code = isTRUE(it$code), output = isTRUE(it$output))
        } else if (is_section_item(it)) {
          list(section = it$section)
        } else {
          list(text = it$text, html = md_html(it$text))
        }
      }
    ),
    # `free`: the block can take one more link, which a drag onto it needs.
    blocks = Map(
      function(b, id) {
        list(name = blockr.core::block_name(b),
             free = !is.na(free_input(b, id, link_frame(board, input = TRUE))),
             prose = is_prose_block(b))
      },
      blks, names(blks)
    ),
    links = unname(
      lapply(
        split(link_frame(board), seq_len(nrow(link_frame(board)))),
        function(l) list(from = l$from, to = l$to)
      )
    )
  )
}

link_frame <- function(board, input = FALSE) {
  cols <- c("from", "to", if (input) "input")
  lnk <- as.data.frame(blockr.core::board_links(board))
  if (!nrow(lnk)) {
    return(as.data.frame(stats::setNames(rep(list(character()), length(cols)), cols)))
  }
  lnk[, cols]
}

block_names <- function(board, ids) {
  blks <- blockr.core::board_blocks(board)
  vapply(ids, function(id) blockr.core::block_name(blks[[id]]), character(1L))
}

md_html <- function(x) {
  commonmark::markdown_html(x, extensions = TRUE)
}
