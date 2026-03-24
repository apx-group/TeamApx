import { useState, useRef, useEffect } from "react"

interface TabItem {
    id: string
    label: string
    content: React.ReactNode
}

interface CustomTabsProps {
    tabs: TabItem[]
    defaultTab?: number
    onChange?: (index: number) => void
}

export default function CustomTabs({
                                       tabs,
                                       defaultTab = 0,
                                       onChange,
                                   }: CustomTabsProps) {
    const [currentTab, setCurrentTab] = useState(defaultTab)
    const wrapperRef = useRef<HTMLUListElement | null>(null)

    const changeTab = (index: number) => {
        setCurrentTab(index)
        onChange?.(index)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!wrapperRef.current) return
        if (!wrapperRef.current.contains(document.activeElement)) return

        if (e.key === "ArrowRight") {
            changeTab((currentTab + 1) % tabs.length)
        }

        if (e.key === "ArrowLeft") {
            changeTab((currentTab - 1 + tabs.length) % tabs.length)
        }
    }

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    })

    return (
        <section className="max-w-full">
            <ul
                className="flex items-center border-b border-slate-200"
                role="tablist"
                ref={wrapperRef}
            >
                {tabs.map((tab, index) => {
                    const isActive = currentTab === index

                    return (
                        <li key={tab.id} role="presentation">
                            <button
                                role="tab"
                                id={`tab-${tab.id}`}
                                aria-selected={isActive}
                                aria-controls={`panel-${tab.id}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => changeTab(index)}
                                className={`-mb-px inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-t border-b-2 px-6 text-sm font-medium transition duration-300
                ${
                                    isActive
                                        ? "border-emerald-500 text-emerald-500"
                                        : "border-transparent text-slate-700 hover:border-emerald-500 hover:text-emerald-500"
                                }`}
                            >
                                {tab.label}
                            </button>
                        </li>
                    )
                })}
            </ul>

            <div>
                {tabs.map((tab, index) => {
                    const isActive = currentTab === index

                    return (
                        <div
                            key={tab.id}
                            id={`panel-${tab.id}`}
                            role="tabpanel"
                            aria-labelledby={`tab-${tab.id}`}
                            hidden={!isActive}
                            className="px-6 py-4"
                        >
                            {tab.content}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}