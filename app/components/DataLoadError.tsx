// components/DataLoadError.tsx

import React from "react"

interface DataLoadErrorProps {
    resource: string
}

const DataLoadError: React.FC<DataLoadErrorProps> = ({ resource }) => {
    return (
        <main className="text-center p-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Could not load {resource}
            </h1>
            <p className="text-gray-600 mb-2">
                The FastAPI backend did not return {resource} data.
            </p>
            <p className="text-gray-600">
                Make sure the database and API are running:
            </p>
            <pre className="inline-block mt-4 px-4 py-3 bg-gray-100 text-left text-sm rounded">
                {`make start-db\nmake migrate-db\nmake start-server`}
            </pre>
        </main>
    )
}

export default DataLoadError
