#' @importFrom blockr.core board_ui
#' @exportS3Method blockr.core::board_ui
board_ui.page_board <- function(id, x, plugins = blockr.core::board_plugins(x),
                                options = NULL, ...) {

  ns <- shiny::NS(id)

  tool_plugins <- plugins[intersect("preserve_board", names(plugins))]

  htmltools::tagList(
    page_dep(),
    board_ui(id, plugins[["notify_user"]], x),
    htmltools::div(
      class = paste("blockr-page", if (page_read_only()) "bp-read bp-readonly"),
      id = ns("page"),
      `data-ns` = ns(""),
      # The bar of blockr.dock's navbar (feat/navbar-views): the mark, the
      # page's name, Save. Save and restore are core's preserve_board,
      # reached from the menus.
      htmltools::div(
        class = "bp-nav",
        htmltools::span(class = "bp-mark", htmltools::HTML(icon_svg("mark"))),
        htmltools::tags$button(
          class = "bp-q bp-name", type = "button",
          htmltools::span(class = "bp-nm", page_name(page_items(x))),
          htmltools::HTML(icon_svg("chevron"))
        ),
        htmltools::tags$button(
          class = "bp-q bp-save", type = "button", "Save",
          htmltools::HTML(icon_svg("chevron"))
        ),
        htmltools::span(class = "bp-sp"),
        htmltools::tags$button(
          class = "bp-navbtn bp-toc-toggle", type = "button",
          htmltools::HTML(icon_svg("list")), "Contents"
        )
      ),
      # Laid out but off screen, so Shiny keeps the download links bound; the
      # menus click them.
      htmltools::div(
        class = "bp-offscreen",
        board_ui(id, tool_plugins, x),
        htmltools::tags$a(id = ns("page_dl"), class = "shiny-download-link",
                          href = "", target = "_blank", download = NA, "source"),
        htmltools::tags$a(id = ns("page_html"), class = "shiny-download-link",
                          href = "", target = "_blank", download = NA, "html")
      ),
      htmltools::div(
        class = "bp-body",
        htmltools::div(
          class = "bp-scroll",
          htmltools::div(
            class = "bp-docwrap",
            # The graph's switch: a word that appears while the pointer is
            # over the gutter, and nothing at rest.
            htmltools::div(
              class = "bp-gutzone",
              htmltools::tags$button(class = "bp-gutlabel", type = "button", "Hide graph")
            ),
            htmltools::tags$svg(class = "bp-rail"),
            htmltools::div(
              class = "bp-doc",
              id = ns("blocks"),
              block_ui(id, x)
            )
          )
        ),
        htmltools::div(class = "bp-toc")
      ),
      htmltools::div(class = "bp-toast"),
      htmltools::tags$script(
        type = "application/json",
        class = "bp-registry",
        htmltools::HTML(registry_json())
      )
    )
  )
}

#' @importFrom blockr.core block_ui
#' @exportS3Method blockr.core::block_ui
block_ui.page_board <- function(id, x, blocks = NULL, ...) {

  if (is.null(blocks)) {
    blocks <- blockr.core::board_blocks(x)
  } else if (is.character(blocks)) {
    blocks <- blockr.core::board_blocks(x)[blocks]
  }

  stopifnot(blockr.core::is_blocks(blocks))

  htmltools::tagList(
    Map(page_block_card, blocks, names(blocks), MoreArgs = list(ns = shiny::NS(id)))
  )
}

page_block_card <- function(blk, blk_id, ns) {

  srv_id <- ns(paste0("block_", blk_id))

  # The sections a block shows, as blockr.dock reads them: a chart block puts
  # its chart in the inputs section and asks for `visible = "inputs"`. Without
  # the attribute the page shows the output and keeps the inputs behind the
  # gear.
  visible <- attr(blk, "visible")
  if (is.null(visible)) visible <- "outputs"

  htmltools::tags$section(
    class = paste(
      "bp-blk",
      if ("inputs" %in% visible) "bp-band-open",
      if (!"outputs" %in% visible) "bp-out-hidden"
    ),
    id = ns(paste0("bp-block-", blk_id)),
    `data-block-id` = blk_id,
    # The header: the block's name as a caption, then the page's switches,
    # shown on hover: Controls (dock's name and icon for the inputs section),
    # Code and Output (the report's two switches), then "..." for the rest.
    htmltools::tags$header(
      class = "bp-bh",
      htmltools::span(class = "bp-bname", blockr.core::block_name(blk)),
      htmltools::span(class = "bp-sum"),
      htmltools::span(class = "bp-bsp"),
      if (has_controls(blk)) {
        htmltools::tags$button(
          class = "bp-gh bp-ctl-t", type = "button", title = "Controls",
          htmltools::HTML(icon_svg("sliders"))
        )
      },
      htmltools::tags$button(
        class = "bp-gh bp-code-t", type = "button", title = "Code in the document",
        htmltools::HTML(icon_svg("code"))
      ),
      htmltools::tags$button(
        class = "bp-gh bp-eye-t", type = "button", title = "Output in the document",
        htmltools::HTML(icon_svg("eye")), htmltools::HTML(icon_svg("eyeoff"))
      ),
      htmltools::tags$button(
        class = "bp-gh bp-more", type = "button", title = "More actions",
        htmltools::HTML(icon_svg("dots"))
      )
    ),
    htmltools::div(class = "bp-band", blockr.core::expr_ui(srv_id, blk)),
    htmltools::tags$pre(class = "bp-codeview"),
    htmltools::div(class = "bp-out", block_ui(srv_id, blk))
  )
}

#' @importFrom blockr.core insert_block_ui
#' @exportS3Method blockr.core::insert_block_ui
insert_block_ui.page_board <- function(id, x, blocks = NULL, ...,
                                       session = blockr.core::get_session()) {

  shiny::insertUI(
    paste0("#", shiny::NS(id, "blocks")),
    "beforeEnd",
    block_ui(id, x, blocks),
    immediate = TRUE,
    session = session
  )

  invisible(x)
}

#' @importFrom blockr.core remove_block_ui
#' @exportS3Method blockr.core::remove_block_ui
remove_block_ui.page_board <- function(id, x, blocks = NULL, ...,
                                       session = blockr.core::get_session()) {

  if (is.null(blocks)) {
    blocks <- blockr.core::board_block_ids(x)
  }

  for (blk in blocks) {
    shiny::removeUI(
      paste0("#", shiny::NS(id, paste0("bp-block-", blk))),
      immediate = TRUE,
      session = session
    )
  }

  invisible(x)
}

#' @importFrom blockr.core board_plugins
#' @exportS3Method blockr.core::board_plugins
board_plugins.page_board <- function(x, which = NULL, ...) {

  # The page adds blocks through its own insert menu, so core's block, link
  # and stack managers stay out, and the Source column replaces core's code
  # dialog.
  plugins <- blockr.core::plugins(
    blockr.core::preserve_board(),
    blockr.core::notify_user(),
    blockr.core::edit_block()
  )

  if (is.null(which)) {
    return(plugins)
  }

  plugins[which]
}

#' @importFrom blockr.core blockr_app_ui
#' @exportS3Method blockr.core::blockr_app_ui
blockr_app_ui.page_board <- function(id, x, ..., query = list()) {
  bslib::page(
    theme = bslib::bs_theme(version = 5),
    title = "blockr",
    board_ui(id, x, ...)
  )
}

# Whether a block has anything to configure: its expression UI renders markup
# (blockr.dock decides its Controls row the same way).
has_controls <- function(blk) {
  markup <- htmltools::renderTags(blockr.core::expr_ui("block", blk))[["html"]]
  nzchar(trimws(as.character(markup)))
}

# A page served for readers: Read, without the switch, nothing editable.
# `options(blockr.page.mode = "read")` before serve().
page_read_only <- function() {
  identical(getOption("blockr.page.mode"), "read")
}

page_dep <- function() {
  htmltools::tagList(
    blockr.ui::theme_dep(),
    blockr.ui::controls_dep(),
    htmltools::htmlDependency(
      "blockr-page",
      as.character(utils::packageVersion("blockr.page")),
      src = "assets",
      package = "blockr.page",
      script = "js/blockr-page.js",
      # the font files travel with the dependency (all_files), and the
      # common Latin face is preloaded so charts measure their text in it
      stylesheet = c("css/blockr-page-font.css", "css/blockr-page.css"),
      head = paste0(
        '<link rel="preload" as="font" type="font/woff2" crossorigin ',
        'href="blockr-page-',
        as.character(utils::packageVersion("blockr.page")),
        '/fonts/inter-normal-latin.woff2">'
      ),
      all_files = TRUE
    )
  )
}

# What the "+" menu offers, as blockr.dock's: every registered block, by
# category, with its mark and package. `append` marks the blocks that can
# receive a link (a free input, or variadic); appending offers only those.
registry_json <- function() {

  key <- registry_key(blockr.core::list_blocks())

  if (!identical(registry_cache$key, key)) {

    meta <- blockr.core::block_metadata(
      blockr.core::list_blocks(),
      c("id", "name", "category", "icon", "package")
    )

    meta$append <- vapply(
      meta$id,
      function(id) {
        blk <- tryCatch(blockr.core::create_block(id), error = function(e) NULL)
        !is.null(blk) && (length(blockr.core::block_inputs(blk)) > 0L ||
                            is.na(blockr.core::block_arity(blk)))
      },
      logical(1L)
    )

    cats <- names(blockr.core::suggested_categories())
    meta <- meta[order(match(meta$category, cats), tolower(meta$name)), ]

    registry_cache$key <- key
    registry_cache$json <- jsonlite::toJSON(meta, dataframe = "rows",
                                            auto_unbox = TRUE)
  }

  registry_cache$json
}

registry_cache <- new.env(parent = emptyenv())

registry_key <- function(x) paste(sort(x), collapse = ",")

icon_svg <- function(name) {
  switch(
    name,
    stack = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    graph = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="4" cy="3" r="1.6"/><circle cx="4" cy="13" r="1.6"/><circle cx="12" cy="8" r="1.6"/><path d="M4 4.6v6.8M4 5.5c0 2.5 2 2.5 6.4 2.5"/></svg>',
    list = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>',
    grip = '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5.5" cy="3" r="1.3"/><circle cx="10.5" cy="3" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="13" r="1.3"/><circle cx="10.5" cy="13" r="1.3"/></svg>',
    gear = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.858 2.929 2.929 0 0 1 0 5.858z"/></svg>',
    code = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"/></svg>',
    eye = '<svg class="bp-i-eye" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>',
    eyeoff = '<svg class="bp-i-eyeoff" viewBox="0 0 16 16" fill="currentColor"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/><path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/></svg>',
    mark = '<svg viewBox="0 0 224 224" width="20" height="20"><g fill="currentColor"><rect x="0" y="0" width="64" height="64" rx="7"/><rect x="80" y="0" width="64" height="64" rx="7"/><rect x="160" y="0" width="64" height="64" rx="7"/><rect x="0" y="80" width="64" height="64" rx="7"/><rect x="80" y="80" width="64" height="64" rx="7"/><rect x="0" y="160" width="64" height="64" rx="7"/><rect x="160" y="160" width="64" height="64" rx="7"/></g></svg>',
    chevron = '<svg class="bp-chevron" viewBox="0 0 12 12" width="12" height="12"><polyline points="3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    branch = '<svg viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.5 2.5 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/></svg>',
    sliders = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 4h7M12 4h2M2 12h2M7 12h7"/><circle cx="10.5" cy="4" r="1.5"/><circle cx="5.5" cy="12" r="1.5"/><path d="M2 8h3M8 8h6"/><circle cx="6.5" cy="8" r="1.5"/></svg>',
    dots = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>',
    chev = '<svg viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>'
  )
}
