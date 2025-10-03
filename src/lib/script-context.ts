/**
 * Script Context - Simplified API for script execution
 *
 * Provides simplified wrappers around Playwright APIs for easier scripting
 * without requiring deep knowledge of the Playwright API structure.
 */

/**
 * Create a simplified script context with helper functions
 */
export function createScriptContext(
  page: any,
  browserContext: any,
  browser: any,
  consoleWrapper?: any
) {
  // Use provided console wrapper or default to console
  const logger = consoleWrapper || console

  return {
    // Core Playwright objects
    page,
    context: browserContext,
    browser,

    // Simplified navigation helpers
    goto: async (url: string) => await page.goto(url),
    back: async () => await page.goBack(),
    forward: async () => await page.goForward(),
    reload: async () => await page.reload(),

    // Simplified interaction helpers
    click: async (selector: string) => await page.click(selector),
    type: async (selector: string, text: string) =>
      await page.type(selector, text),
    fill: async (selector: string, value: string) =>
      await page.fill(selector, value),
    press: async (key: string) => await page.keyboard.press(key),
    hover: async (selector: string) => await page.hover(selector),

    // Simplified element helpers
    text: async (selector: string) => await page.textContent(selector),
    html: async (selector?: string) =>
      selector ? await page.innerHTML(selector) : await page.content(),
    value: async (selector: string) => await page.inputValue(selector),
    isVisible: async (selector: string) => await page.isVisible(selector),
    isEnabled: async (selector: string) => await page.isEnabled(selector),
    count: async (selector: string) => await page.locator(selector).count(),

    // Simplified waiting helpers
    waitFor: async (selector: string, options?: any) =>
      await page.waitForSelector(selector, options),
    waitForText: async (text: string) =>
      await page.waitForFunction(`document.body.innerText.includes('${text}')`),
    waitForUrl: async (url: string | RegExp) => await page.waitForURL(url),
    sleep: async (ms: number) => await page.waitForTimeout(ms),

    // Simplified evaluation helpers
    eval: async (script: string) => await page.evaluate(script),
    evalOn: async (selector: string, script: string) =>
      await page.$eval(selector, script),
    evalAll: async (selector: string, script: string) =>
      await page.$$eval(selector, script),

    // Page information helpers
    url: () => page.url(),
    title: async () => await page.title(),
    screenshot: async (path?: string) =>
      await page.screenshot(path ? { path } : {}),
    pdf: async (path?: string) => await page.pdf(path ? { path } : {}),

    // Form helpers
    check: async (selector: string) => await page.check(selector),
    uncheck: async (selector: string) => await page.uncheck(selector),
    select: async (selector: string, values: string | string[]) =>
      await page.selectOption(selector, values),
    upload: async (selector: string, files: string | string[]) =>
      await page.setInputFiles(selector, files),

    // Multiple tab helpers
    newTab: async (url?: string) => {
      const newPage = await browserContext.newPage()
      if (url) await newPage.goto(url)
      return createScriptContext(newPage, browserContext, browser)
    },

    closeTab: async () => await page.close(),

    // Local storage helpers
    setStorage: async (key: string, value: string) =>
      await page.evaluate(`localStorage.setItem('${key}', '${value}')`),
    getStorage: async (key: string) =>
      await page.evaluate(`localStorage.getItem('${key}')`),
    clearStorage: async () => await page.evaluate('localStorage.clear()'),

    // Cookie helpers
    setCookie: async (name: string, value: string, options?: any) =>
      await browserContext.addCookies([
        { name, value, url: page.url(), ...options },
      ]),
    getCookies: async () => await browserContext.cookies(),
    clearCookies: async () => await browserContext.clearCookies(),

    // Utility helpers
    log: (...args: any[]) => logger.log(...args),
    debug: (..._args: any[]) => {},

    // Advanced helpers for common patterns
    fillForm: async (fields: Record<string, string>) => {
      for (const [selector, value] of Object.entries(fields)) {
        await page.fill(selector, value)
      }
    },

    clickAndWait: async (selector: string, waitFor: string) => {
      await page.click(selector)
      await page.waitForSelector(waitFor)
    },

    typeAndSubmit: async (
      inputSelector: string,
      text: string,
      submitSelector?: string
    ) => {
      await page.fill(inputSelector, text)
      if (submitSelector) {
        await page.click(submitSelector)
      } else {
        await page.press(inputSelector, 'Enter')
      }
    },

    scrollTo: async (selector: string) => {
      await page.locator(selector).scrollIntoViewIfNeeded()
    },

    // Extract data helpers
    extractText: async (selector: string) => {
      const elements = await page.locator(selector).all()
      const texts = []
      for (const elem of elements) {
        texts.push(await elem.textContent())
      }
      return texts
    },

    extractLinks: async (selector?: string) => {
      const linkSelector = selector || 'a[href]'
      return await page.$$eval(linkSelector, (links: any[]) =>
        links.map((link: any) => ({
          text: link.textContent?.trim(),
          href: link.getAttribute('href'),
          title: link.getAttribute('title'),
        }))
      )
    },

    extractTable: async (selector: string) => {
      return await page.$eval(selector, (table: any) => {
        const rows = Array.from(table.querySelectorAll('tr'))
        return rows.map((row: any) => {
          const cells = Array.from(row.querySelectorAll('td, th'))
          return cells.map((cell: any) => cell.textContent?.trim())
        })
      })
    },
  }
}

/**
 * Enhanced script execution with simplified context
 */
export async function executeWithSimplifiedContext(
  code: string,
  page: any,
  browserContext: any,
  browser: any,
  consoleWrapper: any
) {
  // Create simplified context with console wrapper
  const ctx = createScriptContext(page, browserContext, browser, consoleWrapper)

  // Create execution function with all helper methods available
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  const executeCode = new AsyncFunction(
    // Core Playwright objects
    'page',
    'context',
    'browser',
    'console',
    // All simplified helpers as individual parameters
    'goto',
    'back',
    'forward',
    'reload',
    'click',
    'type',
    'fill',
    'press',
    'hover',
    'text',
    'html',
    'value',
    'isVisible',
    'isEnabled',
    'count',
    'waitFor',
    'waitForText',
    'waitForUrl',
    'sleep',
    'eval',
    'evalOn',
    'evalAll',
    'url',
    'title',
    'screenshot',
    'pdf',
    'check',
    'uncheck',
    'select',
    'upload',
    'newTab',
    'closeTab',
    'setStorage',
    'getStorage',
    'clearStorage',
    'setCookie',
    'getCookies',
    'clearCookies',
    'log',
    'debug',
    'fillForm',
    'clickAndWait',
    'typeAndSubmit',
    'scrollTo',
    'extractText',
    'extractLinks',
    'extractTable',
    // The actual code to execute
    code
  )

  // Execute with all helpers available as individual variables
  return await executeCode(
    // Core objects
    ctx.page,
    ctx.context,
    ctx.browser,
    consoleWrapper,
    // All helpers
    ctx.goto,
    ctx.back,
    ctx.forward,
    ctx.reload,
    ctx.click,
    ctx.type,
    ctx.fill,
    ctx.press,
    ctx.hover,
    ctx.text,
    ctx.html,
    ctx.value,
    ctx.isVisible,
    ctx.isEnabled,
    ctx.count,
    ctx.waitFor,
    ctx.waitForText,
    ctx.waitForUrl,
    ctx.sleep,
    ctx.eval,
    ctx.evalOn,
    ctx.evalAll,
    ctx.url,
    ctx.title,
    ctx.screenshot,
    ctx.pdf,
    ctx.check,
    ctx.uncheck,
    ctx.select,
    ctx.upload,
    ctx.newTab,
    ctx.closeTab,
    ctx.setStorage,
    ctx.getStorage,
    ctx.clearStorage,
    ctx.setCookie,
    ctx.getCookies,
    ctx.clearCookies,
    ctx.log,
    ctx.debug,
    ctx.fillForm,
    ctx.clickAndWait,
    ctx.typeAndSubmit,
    ctx.scrollTo,
    ctx.extractText,
    ctx.extractLinks,
    ctx.extractTable
  )
}
