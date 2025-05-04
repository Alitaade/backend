// Helper function to generate CSV from data
export function generateCSV(data: any[], headers: string[]) {
    // Add headers row
    let csv = headers.join(",") + "\n"
  
    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        // Get the value based on the header (convert to lowercase and replace spaces with underscores)
        const key = header.toLowerCase().replace(/ /g, "_")
        let value = row[key] || ""
  
        // Handle values with commas, quotes, or newlines
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          value = `"${value.replace(/"/g, '""')}"`
        }
  
        return value
      })
  
      csv += values.join(",") + "\n"
    })
  
    return csv
  }
  