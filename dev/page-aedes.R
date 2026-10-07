# The aedes board from blockr.stats as one document. No blockr.dock: the
# block packages here import blockr.core and blockr.ui only.
#
#   Rscript blockr.page/dev/page-aedes.R      (from /workspace)
#
# Needs glmmTMB, broom.helpers, gtsummary and ggplot2 for the published model.

root <- if (dir.exists("blockr.core")) "." else ".."

for (pkg in c("blockr.core", "blockr.ui", "blockr.dplyr", "blockr.viz",
              "blockr.stats", "blockr.extra", "blockr.page")) {
  pkgload::load_all(file.path(root, pkg), quiet = TRUE)
}

options(blockr.tabular_display = blockr.ui::html_table_display)

# The R scripts of the code blocks, taken from the example board so the two
# stay the same: every top-level `*_script <- "..."` in that file.
example <- parse(file.path(root, "blockr.stats/inst/examples/aedes-ivm.R"))
for (e in example) {
  if (is.call(e) && identical(e[[1L]], as.name("<-")) &&
        grepl("_script$", deparse(e[[2L]]))) {
    eval(e)
  }
}

show_inputs <- function(blk) `attr<-`(blk, "visible", "inputs")

board <- new_page_board(
  blocks = c(
    ovi = new_dataset_block("aedes_ovitraps", package = "blockr.stats",
                            block_name = "Ovitrap Data"),
    desc = new_code_block(script = desc_script,
                          block_name = "Descriptive Stats"),
    # `visible`: the sections the card shows, as in the example board. The
    # chart and the formula live in the inputs section.
    season_ct = show_inputs(blockr.viz::new_chart_block(
      chart_type = "scatter",
      x = "Day.ovitrap.collected", y = "No..eggs.AEDES",
      color = "AREA", smoother = "loess",
      title = "Eggs collected", subtitle = "All traps, per day",
      block_name = "Eggs Collected"
    )),
    mdl = show_inputs(blockr.stats::new_model_block(
      model_type = "poisson",
      formula = "No..eggs.AEDES ~ AREA",
      block_name = "Basic Model"
    )),
    mcoef = new_code_block(script = basic_regression_script,
                           block_name = "Model Summary"),
    mdiag = new_code_block(script = glm_diag_script,
                           block_name = "Compute Fitted"),
    mfit = show_inputs(blockr.viz::new_chart_block(
      chart_type = "scatter",
      x = "Day.ovitrap.collected", y = "fitted", color = "AREA",
      block_name = "Predicted Values"
    )),
    glmm = new_code_block(script = glmm_script,
                          block_name = "Published Model (GLMM)"),
    gtbl = new_code_block(script = regression_script,
                          block_name = "Published Model Summary"),
    gseason_gg = new_code_block(script = season_gg_script,
                                block_name = "Published Plot")
  ),
  links = links(
    from = c("ovi", "ovi", "ovi", "ovi", "mdl", "mdl", "mdiag", "glmm", "glmm"),
    to   = c("desc", "season_ct", "mdl", "glmm", "mdiag", "mcoef", "mfit",
             "gtbl", "gseason_gg"),
    input = rep("data", 9L)
  ),
  items = list(
    list(text = "# Mosquito control in southern Switzerland"),
    list(text = paste(
      "Tiger mosquito egg counts from 36 ovitraps in six towns on both sides",
      "of the Swiss-Italian border, 2019. The three Swiss towns run an",
      "integrated control programme, the three Italian towns do not. Does the",
      "programme work? Data: Ravasi et al. (2021), *Parasites & Vectors* 14, 405."
    )),
    list(block = "ovi"),
    list(section = "The data"),
    list(block = "desc"),
    list(block = "season_ct"),
    list(text = paste(
      "Counts climb towards a peak in August. The untreated towns sit higher",
      "all season."
    )),
    list(section = "A first model"),
    list(text = "A Poisson model of egg count on area, built in the model block without code."),
    # a model block is a transform that feeds others, so it would start as a
    # step; this page shows the formula and the fit
    list(block = "mdl", output = TRUE),
    list(block = "mcoef"),
    list(block = "mdiag"),
    list(block = "mfit"),
    list(text = paste(
      "It finds 3.59 times more eggs without the programme, 95% CI 3.51 to",
      "3.67. The interval is too narrow. Each trap is read up to ten times, and",
      "the residual deviance is 180 times its degrees of freedom."
    )),
    list(section = "The published model"),
    list(text = paste(
      "A negative binomial mixed model with a quadratic season, days in the",
      "field as exposure, and random intercepts for trap and town."
    )),
    list(block = "glmm"),
    list(block = "gtbl"),
    list(block = "gseason_gg"),
    list(text = paste(
      "**3.81 times** more eggs without the programme, 95% CI 2.72 to 5.35.",
      "The paper reports 3.8 (2.7 to 5.4)."
    ))
  )
)

stopifnot(!"blockr.dock" %in% loadedNamespaces())

port <- if (exists("blockr_port")) blockr_port() else 3838L
message("blockr.page aedes demo on http://127.0.0.1:", port)
shiny::runApp(serve(board, id = "page"), port = port, host = "0.0.0.0",
              launch.browser = FALSE)
