"use client"

import React, { useCallback } from "react"

const PrintButton: React.FC = () => {
    const handlePrint = useCallback(() => {
        window.print()
    }, [])

    return (
        <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Print this recipe"
        >
            Print / Save PDF
        </button>
    )
}

export default PrintButton
