import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it } from "vitest"

import { App } from "./App"
import { i18n, initializeI18n } from "./i18n/i18n"
import { themePreferenceStorageKey } from "./theme/themePreference"

class ControllableMediaQueryList extends EventTarget implements MediaQueryList {
  readonly media = "(prefers-color-scheme: dark)"
  onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null = null
  matches = false

  addListener(callback: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null): void {
    void callback
  }

  removeListener(
    callback: ((this: MediaQueryList, event: MediaQueryListEvent) => void) | null,
  ): void {
    void callback
  }
}

function renderAppAt(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe("App Stage 5 runtime shell", () => {
  beforeEach(async () => {
    // Given: each App test starts from Korean copy, clean storage, and a clean root theme.
    localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
    document.documentElement.style.colorScheme = ""
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => new ControllableMediaQueryList(),
      writable: true,
    })
    await initializeI18n()
    await i18n.changeLanguage("ko")
  })

  it("exposes one primary main landmark", () => {
    // Given: the Stage 4 app shell is rendered inside a router.
    renderAppAt()

    // When: assistive technology discovers page landmarks.
    const mainLandmarks = screen.getAllByRole("main", { name: "iLove Pets 앱 셸" })

    // Then: exactly one primary content landmark is available.
    expect(mainLandmarks).toHaveLength(1)
  })

  it("names the home route with a level-one heading", () => {
    // Given: the Stage 5 home route is rendered.
    renderAppAt()

    // When: the primary heading is queried by accessible name.
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "홈",
    })

    // Then: the home route title is exposed as the page title.
    expect(heading).toBeInTheDocument()
  })

  it("renders the home feed without the Stage 4 readiness status", () => {
    // Given: the Stage 5 home route is rendered.
    renderAppAt()

    // When: the home feed is discovered by semantic role.
    const feed = screen.getByRole("feed", { name: "반려동물 피드" })

    // Then: the real feed replaces the readiness message.
    expect(feed).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByText("프론트엔드 기반 준비 완료")).not.toBeInTheDocument()
  })

  it("renders accessible Korean theme preference controls", () => {
    // Given: the settings route renders the theme preference controls.
    renderAppAt("/settings")

    // When: theme preference controls are discovered by their labelled group.
    const themeGroup = screen.getByRole("group", { name: "테마 설정" })
    const buttons = within(themeGroup).getAllByRole("button")

    // Then: all preferences are visible real buttons with the system option selected by default.
    expect(buttons.map((button) => button.textContent)).toEqual(["시스템", "라이트", "다크"])
    expect(within(themeGroup).getByRole("button", { name: "시스템" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("persists dark preference and applies the dark root theme", () => {
    // Given: the settings route renders the theme preference controls.
    renderAppAt("/settings")

    // When: the user chooses dark mode.
    fireEvent.click(screen.getByRole("button", { name: "다크" }))

    // Then: the selected preference is stored and exposed on the document root.
    expect(localStorage.getItem(themePreferenceStorageKey)).toBe("dark")
    expect(document.documentElement.dataset["theme"]).toBe("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
    expect(screen.getByRole("button", { name: "다크" })).toHaveAttribute("aria-pressed", "true")
  })

  it("persists system preference when returning from an explicit theme", () => {
    // Given: the settings route renders the theme preference controls.
    renderAppAt("/settings")
    fireEvent.click(screen.getByRole("button", { name: "다크" }))

    // When: the user returns to system mode.
    fireEvent.click(screen.getByRole("button", { name: "시스템" }))

    // Then: system mode is persisted and announced as selected.
    expect(localStorage.getItem(themePreferenceStorageKey)).toBe("system")
    expect(screen.getByRole("button", { name: "시스템" })).toHaveAttribute("aria-pressed", "true")
  })

  it("lists the default home feed posts", () => {
    // Given: the Stage 5 home route is rendered.
    renderAppAt()

    // When: feed articles are read from the semantic feed.
    const feed = screen.getByRole("feed", { name: "반려동물 피드" })
    const articles = within(feed).getAllByRole("article")

    // Then: mock feed content is visible through the app shell.
    expect(articles).toHaveLength(4)
    expect(within(feed).getByText("Bori")).toBeInTheDocument()
    expect(within(feed).getByText("Miso")).toBeInTheDocument()
  })

  it("renders the fixed five-item bottom navigation in translated order", () => {
    // Given: the Stage 4 app is rendered in Korean.
    renderAppAt()

    // When: the bottom navigation is discovered by its landmark label.
    const navigation = screen.getByRole("navigation", { name: "주요 탐색" })
    const links = within(navigation).getAllByRole("link")

    // Then: exactly five accessible route links are exposed in product order.
    expect(links.map((link) => link.textContent)).toEqual(["홈", "탐색", "작성", "활동", "내 계정"])
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/explore",
      "/create",
      "/activity",
      "/myaccount",
    ])
  })

  it("marks the active route without relying on color alone", () => {
    // Given: the create route is active.
    renderAppAt("/create")

    // When: the create navigation item is queried by visible label.
    const createLink = screen.getByRole("link", { name: "작성" })

    // Then: React Router exposes the active page state for assistive technology and styling.
    expect(createLink).toHaveAttribute("aria-current", "page")
    expect(createLink).toHaveClass("bottom-navigation__link--active")
  })

  it("renders the real stage 6 screens for every non-home route", () => {
    // Given: each non-home Stage 6 route is opened directly.
    const routes = [
      { path: "/explore", heading: "탐색" },
      { path: "/create", heading: "작성" },
      { path: "/activity", heading: "활동" },
      { path: "/myaccount", heading: "내 계정" },
      { path: "/settings", heading: "설정" },
    ] as const

    for (const route of routes) {
      // When: the route is rendered.
      const { unmount } = renderAppAt(route.path)

      // Then: the real route heading is translated and no home status region is duplicated.
      expect(screen.getByRole("heading", { level: 1, name: route.heading })).toBeInTheDocument()
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
      unmount()
    }
  })

  it("redirects unknown routes to the home route", () => {
    // Given: an unknown route is opened inside memory history.
    renderAppAt("/missing-route")

    // When: React Router resolves the route tree.
    const homeLink = screen.getByRole("link", { name: "홈" })

    // Then: the user lands on home and the home navigation item is active.
    expect(screen.getByRole("heading", { level: 1, name: "홈" })).toBeInTheDocument()
    expect(homeLink).toHaveAttribute("aria-current", "page")
  })
})
