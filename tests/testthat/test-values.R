test_that("a model reports its coefficients, intervals and fit as code", {
  fit <- glm(am ~ wt, data = mtcars, family = binomial())
  vals <- page_values_now(fit, "fit")
  labs <- vapply(vals, `[[`, "", "label")
  expect_true(all(c("Odds ratio, wt", "95% CI, wt", "p-value, wt", "Observations") %in% labs))
  or <- vals[[match("Odds ratio, wt", labs)]]
  expect_identical(or$value, format(round(exp(coef(fit)[["wt"]]), 2)))
  # the code runs where the text knows the model by its name
  expect_equal(eval(parse(text = or$expr)[[1]], list(fit = fit)), round(exp(coef(fit)[["wt"]]), 2))
  ci <- vals[[match("95% CI, wt", labs)]]
  expect_match(ci$value, "^[0-9.]+ to [0-9.]+$")
})

test_that("a factor's level is named as such", {
  d <- transform(mtcars, gears = factor(gear))
  labs <- vapply(page_values_now(lm(mpg ~ gears, d), "m"), `[[`, "", "label")
  expect_true("Coefficient, gears: 4" %in% labs)
})

test_that("a linear model reports coefficients and R squared", {
  vals <- page_values_now(lm(mpg ~ wt + `disp`, mtcars), "m")
  labs <- vapply(vals, `[[`, "", "label")
  expect_true(all(c("Coefficient, wt", "Coefficient, disp", "R squared") %in% labs))
})

test_that("a data frame reports its size and column means", {
  d <- data.frame(x = 1:4, `a b` = c(2, 4, 6, 8), z = letters[1:4], check.names = FALSE)
  vals <- page_values_now(d, "d")
  labs <- vapply(vals, `[[`, "", "label")
  expect_identical(labs, c("Rows", "Columns", "Mean of x", "Mean of a b"))
  expect_identical(vals[[4]]$expr, "round(mean(d[[\"a b\"]], na.rm = TRUE), 2)")
  expect_identical(vals[[4]]$value, "5")
})

test_that("a test reports its estimate, interval and p-value", {
  vals <- page_values_now(t.test(mtcars$mpg), "tt")
  labs <- vapply(vals, `[[`, "", "label")
  expect_true(all(c("mean of x", "95% CI", "t", "p-value") %in% labs))
})

test_that("a result without values reports none", {
  expect_identical(page_values_now(list(1, 2), "x"), list())
})
