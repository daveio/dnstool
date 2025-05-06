import _ from "lodash"
import Papa from "papaparse"
import React, { useState, useEffect } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

const DNSAnalyzer = () => {
  // State definitions
  const [fileData, setFileData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [activeView, setActiveView] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("totalQueries")
  const [sortDirection, setSortDirection] = useState("desc")
  const [selectedIP, setSelectedIP] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)
  const [fileInput, setFileInput] = useState(null)

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#A4DE6C",
    "#D0ED57",
    "#83a6ed",
    "#8dd1e1"
  ]

  // Extract base domain (domain.tld) from query value
  const extractBaseDomain = (queryValue) => {
    if (!queryValue) return null

    // Handle special cases like in-addr.arpa or ip6.arpa (reverse DNS lookups)
    if (queryValue.endsWith(".in-addr.arpa") || queryValue.endsWith(".ip6.arpa")) {
      return queryValue.split(".").slice(-2).join(".")
    }

    // Extract domain.tld using string split
    const parts = queryValue.split(".")
    if (parts.length >= 2) {
      return parts.slice(-2).join(".")
    }

    return queryValue
  }

  // Process the data to extract rankings
  const processData = (data) => {
    // Filter out rows with no Query Value or Client IP
    const validData = data.filter(
      (row) =>
        row["Query Value"] &&
        row["Client IP"] &&
        typeof row["Query Value"] === "string" &&
        typeof row["Client IP"] === "string"
    )

    // Extract base domains for each query
    const enrichedData = validData.map((row) => ({
      ...row,
      baseDomain: extractBaseDomain(row["Query Value"])
    }))

    // Group by Client IP and count domains
    const ipToDomains = _.groupBy(enrichedData, "Client IP")
    const ipDomainCounts = Object.entries(ipToDomains).map(([ip, rows]) => {
      const domainCounts = _.countBy(rows, "baseDomain")
      const uniqueDomains = Object.keys(domainCounts).length
      const totalQueries = rows.length

      return {
        ip,
        uniqueDomains,
        totalQueries,
        domains: Object.entries(domainCounts)
          .map(([domain, count]) => ({ domain, count }))
          .sort((a, b) => b.count - a.count)
      }
    })

    // Group by base domain and count IPs
    const domainToIPs = _.groupBy(enrichedData, "baseDomain")
    const domainIPCounts = Object.entries(domainToIPs).map(([domain, rows]) => {
      const ipCounts = _.countBy(rows, "Client IP")
      const uniqueIPs = Object.keys(ipCounts).length
      const totalQueries = rows.length

      return {
        domain,
        uniqueIPs,
        totalQueries,
        ips: Object.entries(ipCounts)
          .map(([ip, count]) => ({ ip, count }))
          .sort((a, b) => b.count - a.count)
      }
    })

    // Get statistics on query types
    const queryTypeCounts = _.countBy(enrichedData, "Query Type")
    const queryTypeData = Object.entries(queryTypeCounts)
      .filter(([type]) => type !== "null" && type !== null)
      .map(([type, count]) => ({
        name: type || "Unknown",
        value: count
      }))

    // Get top domains overall
    const domainCounts = _.countBy(enrichedData, "baseDomain")
    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)

    // Get top IPs overall
    const ipCounts = _.countBy(enrichedData, "Client IP")
    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)

    return {
      summary: {
        totalRecords: enrichedData.length,
        uniqueDomains: Object.keys(domainCounts).length,
        uniqueIPs: Object.keys(ipCounts).length,
        queryTypes: queryTypeData
      },
      topDomains,
      topIPs,
      ipDomainCounts: ipDomainCounts.sort((a, b) => b.totalQueries - a.totalQueries),
      domainIPCounts: domainIPCounts.sort((a, b) => b.totalQueries - a.totalQueries)
    }
  }

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true)
        const response = await window.fs.readFile("dnslocal.csv", { encoding: "utf8" })

        Papa.parse(response, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result) => {
            setFileData(result.data)
            const analysis = processData(result.data)
            setAnalysisResults(analysis)
            setIsLoading(false)
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error.message}`)
            setIsLoading(false)
          }
        })
      } catch (err) {
        setError(`Error loading file: ${err.message}`)
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    setFileInput(file.name)
    setIsLoading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result

      Papa.parse(content, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (result) => {
          setFileData(result.data)
          const analysis = processData(result.data)
          setAnalysisResults(analysis)
          setIsLoading(false)
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`)
          setIsLoading(false)
        }
      })
    }

    reader.onerror = () => {
      setError("Error reading the file")
      setIsLoading(false)
    }

    reader.readAsText(file)
  }

  // Filter IP data based on search and sort
  const getFilteredIPData = () => {
    if (!analysisResults) return []

    return analysisResults.ipDomainCounts
      .filter((item) => item.ip.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortDirection === "asc") {
          return a[sortField] - b[sortField]
        } else {
          return b[sortField] - a[sortField]
        }
      })
  }

  // Filter domain data based on search and sort
  const getFilteredDomainData = () => {
    if (!analysisResults) return []

    return analysisResults.domainIPCounts
      .filter((item) => item.domain.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortDirection === "asc") {
          return a[sortField] - b[sortField]
        } else {
          return b[sortField] - a[sortField]
        }
      })
  }

  // Toggle sort field and direction
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // Render filters for IP and Domain views
  const renderFilters = () => {
    return (
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder={`Search ${activeView === "ips" ? "IPs" : "domains"}...`}
          className="p-2 border rounded w-full md:w-64"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className={`p-2 border rounded ${sortField === "totalQueries" ? "bg-blue-100" : "bg-white"}`}
            onClick={() => toggleSort("totalQueries")}
          >
            Sort by Total Queries {sortField === "totalQueries" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            className={`p-2 border rounded ${sortField === (activeView === "ips" ? "uniqueDomains" : "uniqueIPs") ? "bg-blue-100" : "bg-white"}`}
            onClick={() => toggleSort(activeView === "ips" ? "uniqueDomains" : "uniqueIPs")}
          >
            Sort by Unique {activeView === "ips" ? "Domains" : "IPs"}{" "}
            {sortField === (activeView === "ips" ? "uniqueDomains" : "uniqueIPs") &&
              (sortDirection === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>
    )
  }

  // Render overview dashboard
  const renderOverview = () => {
    if (!analysisResults) return null

    const { summary, topDomains, topIPs } = analysisResults
    const topDomainsChart = topDomains.slice(0, 10).map((item) => ({
      name: item.domain,
      value: item.count
    }))

    const topIPsChart = topIPs.slice(0, 10).map((item) => ({
      name: item.ip,
      value: item.count
    }))

    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Total Records</h3>
            <p className="text-3xl font-bold">{summary.totalRecords.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Unique Domains</h3>
            <p className="text-3xl font-bold">{summary.uniqueDomains.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Unique IP Addresses</h3>
            <p className="text-3xl font-bold">{summary.uniqueIPs.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Query Types Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.queryTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {summary.queryTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Top 10 Domains</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDomainsChart} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={70} />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 IP Addresses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIPsChart} layout="vertical" margin={{ top: 5, right: 30, left: 70, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={70} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  // Render IP analysis view
  const renderIPsView = () => {
    const filteredData = getFilteredIPData()

    return (
      <div className="p-4">
        {renderFilters()}

        {selectedIP ? (
          <div className="mb-4">
            <button className="mb-4 p-2 bg-gray-200 rounded flex items-center" onClick={() => setSelectedIP(null)}>
              <span className="mr-1">←</span> Back to IP List
            </button>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-semibold mb-4">IP: {selectedIP.ip}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Total Queries</p>
                  <p className="text-2xl font-bold">{selectedIP.totalQueries.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Unique Domains</p>
                  <p className="text-2xl font-bold">{selectedIP.uniqueDomains.toLocaleString()}</p>
                </div>
              </div>

              <h4 className="font-semibold mb-2">Top Domains</h4>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={selectedIP.domains.slice(0, 15).map((d) => ({ name: d.domain, value: d.count }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h4 className="font-semibold mb-2">All Domains ({selectedIP.domains.length})</h4>
              <div className="max-h-96 overflow-y-auto bg-gray-50 p-2 rounded">
                <table className="min-w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="py-2 px-4 text-left">Domain</th>
                      <th className="py-2 px-4 text-right">Queries</th>
                      <th className="py-2 px-4 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIP.domains.map((domain, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-2 px-4">{domain.domain}</td>
                        <td className="py-2 px-4 text-right">{domain.count.toLocaleString()}</td>
                        <td className="py-2 px-4 text-right">
                          {((domain.count / selectedIP.totalQueries) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded shadow">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">IP Address</th>
                  <th className="py-2 px-4 text-right">Total Queries</th>
                  <th className="py-2 px-4 text-right">Unique Domains</th>
                  <th className="py-2 px-4">Top Domains</th>
                  <th className="py-2 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2 px-4">{item.ip}</td>
                    <td className="py-2 px-4 text-right">{item.totalQueries.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right">{item.uniqueDomains.toLocaleString()}</td>
                    <td className="py-2 px-4 max-w-md truncate">
                      {item.domains
                        .slice(0, 3)
                        .map((d) => d.domain)
                        .join(", ")}
                      {item.domains.length > 3 && "..."}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        onClick={() => setSelectedIP(item)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Render domain analysis view
  const renderDomainsView = () => {
    const filteredData = getFilteredDomainData()

    return (
      <div className="p-4">
        {renderFilters()}

        {selectedDomain ? (
          <div className="mb-4">
            <button className="mb-4 p-2 bg-gray-200 rounded flex items-center" onClick={() => setSelectedDomain(null)}>
              <span className="mr-1">←</span> Back to Domain List
            </button>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-xl font-semibold mb-4">Domain: {selectedDomain.domain}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Total Queries</p>
                  <p className="text-2xl font-bold">{selectedDomain.totalQueries.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500">Unique IPs</p>
                  <p className="text-2xl font-bold">{selectedDomain.uniqueIPs.toLocaleString()}</p>
                </div>
              </div>

              <h4 className="font-semibold mb-2">Top IP Addresses</h4>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={selectedDomain.ips.slice(0, 15).map((ip) => ({ name: ip.ip, value: ip.count }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <h4 className="font-semibold mb-2">All IP Addresses ({selectedDomain.ips.length})</h4>
              <div className="max-h-96 overflow-y-auto bg-gray-50 p-2 rounded">
                <table className="min-w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="py-2 px-4 text-left">IP Address</th>
                      <th className="py-2 px-4 text-right">Queries</th>
                      <th className="py-2 px-4 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDomain.ips.map((ip, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-2 px-4">{ip.ip}</td>
                        <td className="py-2 px-4 text-right">{ip.count.toLocaleString()}</td>
                        <td className="py-2 px-4 text-right">
                          {((ip.count / selectedDomain.totalQueries) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded shadow">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">Domain</th>
                  <th className="py-2 px-4 text-right">Total Queries</th>
                  <th className="py-2 px-4 text-right">Unique IPs</th>
                  <th className="py-2 px-4">Top IPs</th>
                  <th className="py-2 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2 px-4">{item.domain}</td>
                    <td className="py-2 px-4 text-right">{item.totalQueries.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right">{item.uniqueIPs.toLocaleString()}</td>
                    <td className="py-2 px-4 max-w-md truncate">
                      {item.ips
                        .slice(0, 3)
                        .map((ip) => ip.ip)
                        .join(", ")}
                      {item.ips.length > 3 && "..."}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        onClick={() => setSelectedDomain(item)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // Render network relationship view
  const renderNetworkView = () => {
    if (!analysisResults) return null

    // Create data for a heatmap-like visualization of top domain-IP combinations
    const topDomains = analysisResults.topDomains.slice(0, 10)
    const topIPs = analysisResults.topIPs.slice(0, 10)

    const data = []
    topDomains.forEach((domain) => {
      const domainData = analysisResults.domainIPCounts.find((d) => d.domain === domain.domain)
      if (domainData) {
        topIPs.forEach((ipObj) => {
          const ipData = domainData.ips.find((i) => i.ip === ipObj.ip)
          data.push({
            domain: domain.domain,
            ip: ipObj.ip,
            value: ipData ? ipData.count : 0
          })
        })
      }
    })

    return (
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-4">Domain-IP Relationship Analysis</h3>
        <p className="mb-4">
          This visualization shows the relationship between the top 10 domains and top 10 IP addresses in your DNS data.
          Hover over each cell to see the exact query count.
        </p>

        <div className="bg-white p-4 rounded shadow">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-2 px-4 text-left">Domain \ IP</th>
                {topIPs.map((ip, index) => (
                  <th key={index} className="py-2 px-2 text-center">
                    {ip.ip.split(".").pop()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topDomains.map((domain, domainIndex) => (
                <tr key={domainIndex}>
                  <td className="py-2 px-4 font-medium">{domain.domain}</td>
                  {topIPs.map((ip, ipIndex) => {
                    const cell = data.find((d) => d.domain === domain.domain && d.ip === ip.ip)
                    const value = cell ? cell.value : 0
                    const intensity = value ? Math.min(100, Math.max(10, Math.log10(value) * 25)) : 0

                    return (
                      <td
                        key={ipIndex}
                        className="py-1 px-1 text-center relative"
                        title={`${domain.domain} - ${ip.ip}: ${value} queries`}
                      >
                        <div
                          className="h-8 w-full flex items-center justify-center text-xs"
                          style={{
                            backgroundColor: value ? `rgba(136, 132, 216, ${intensity / 100})` : "transparent",
                            color: intensity > 50 ? "white" : "black"
                          }}
                        >
                          {value > 0 ? value : ""}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gray-100">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-2xl">Loading...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-red-500">{error}</div>
        </div>
      ) : (
        <div>
          <div className="bg-white shadow-md">
            <div className="container mx-auto py-4 px-6">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <h1 className="text-2xl font-bold mb-4 sm:mb-0">DNS Activity Analyzer</h1>

                <div className="flex flex-col sm:flex-row items-center">
                  <label className="flex items-center p-2 bg-blue-50 rounded mb-2 sm:mb-0 sm:mr-4">
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    <span className="bg-blue-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-blue-600">
                      Upload New CSV
                    </span>
                    <span className="ml-2 text-sm text-gray-600">{fileInput ? fileInput : "No file selected"}</span>
                  </label>

                  <div className="flex border rounded overflow-hidden">
                    <button
                      className={`px-3 py-2 ${activeView === "overview" ? "bg-blue-500 text-white" : "bg-white"}`}
                      onClick={() => setActiveView("overview")}
                    >
                      Overview
                    </button>
                    <button
                      className={`px-3 py-2 ${activeView === "ips" ? "bg-blue-500 text-white" : "bg-white"}`}
                      onClick={() => setActiveView("ips")}
                    >
                      IP Analysis
                    </button>
                    <button
                      className={`px-3 py-2 ${activeView === "domains" ? "bg-blue-500 text-white" : "bg-white"}`}
                      onClick={() => setActiveView("domains")}
                    >
                      Domain Analysis
                    </button>
                    <button
                      className={`px-3 py-2 ${activeView === "network" ? "bg-blue-500 text-white" : "bg-white"}`}
                      onClick={() => setActiveView("network")}
                    >
                      Network View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto py-4">
            {activeView === "overview" && renderOverview()}
            {activeView === "ips" && renderIPsView()}
            {activeView === "domains" && renderDomainsView()}
            {activeView === "network" && renderNetworkView()}
          </div>
        </div>
      )}
    </div>
  )
}

export default DNSAnalyzer
