"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowUpIcon } from "@heroicons/react/24/solid"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
} from "chart.js"
import { format, subDays } from "date-fns"
import AdminLayout from "@/components/layout/AdminLayout"
import Card from "@/components/ui/Card"
import apiService from "@/lib/api"
import type { DashboardStats, Order } from "@/types"
import { toast } from "react-hot-toast"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "90days">("30days")

  useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsLoading(true)
      setError(null)
      try {
        console.log(`Fetching dashboard stats for range: ${timeRange}`)
        const data = await apiService.get<DashboardStats>(`/dashboard/stats?range=${timeRange}`)
        console.log("Dashboard stats received:", data)
        setStats(data)
      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err)
        setError(err.message || "Failed to load dashboard data")
        toast.error("Failed to load dashboard data. Using sample data instead.")
        // Use sample data on error
        setStats(generateSampleStats())
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardStats()
  }, [timeRange])

  // Generate sample data for the chart if real data is not available
  const generateSampleData = (): ChartData<"line"> => {
    const labels = Array.from({ length: 30 }, (_, i) => {
      return format(subDays(new Date(), 29 - i), "MMM dd")
    })

    return {
      labels,
      datasets: [
        {
          label: "Sales",
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 1000) + 500),
          borderColor: "rgb(14, 165, 233)",
          backgroundColor: "rgba(14, 165, 233, 0.5)",
          tension: 0.3,
        },
        {
          label: "Orders",
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 50) + 10),
          borderColor: "rgb(124, 58, 237)",
          backgroundColor: "rgba(124, 58, 237, 0.5)",
          tension: 0.3,
        },
      ],
    }
  }

  // Generate sample stats for when API fails - UPDATED to match schema
  const generateSampleStats = (): DashboardStats => {
    return {
      totalUsers: 256,
      totalOrders: 1024,
      totalProducts: 512,
      totalRevenue: 128000,
      recentOrders: [
        {
          id: 1,
          user_id: 1,
          order_number: "ORD-001",
          status: "processing",
          payment_status: "paid",
          payment_method: "card",
          shipping_address: "123 Main St",
          total: 109.99,
          created_at: "2023-11-15T12:00:00Z",
          updated_at: "2023-11-15T12:00:00Z",
          user: {
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
          },
        },
        {
          id: 2,
          user_id: 2,
          order_number: "ORD-002",
          status: "shipped",
          payment_status: "paid",
          payment_method: "paypal",
          shipping_address: "456 Oak St",
          total: 149.99,
          created_at: "2023-11-14T10:30:00Z",
          updated_at: "2023-11-14T10:30:00Z",
          user: {
            first_name: "Jane",
            last_name: "Smith",
            email: "jane@example.com",
          },
        },
      ],
      topProducts: [
        { id: 1, name: "Premium T-Shirt", price: 29.99, order_count: "42", total_quantity: "67" },
        { id: 2, name: "Designer Jeans", price: 89.99, order_count: "38", total_quantity: "52" },
        { id: 3, name: "Running Shoes", price: 119.99, order_count: "35", total_quantity: "41" },
        { id: 4, name: "Wireless Earbuds", price: 149.99, order_count: "31", total_quantity: "37" },
        { id: 5, name: "Smart Watch", price: 199.99, order_count: "28", total_quantity: "32" },
      ],
      salesByDay: Array.from({ length: 30 }, (_, i) => ({
        date: format(subDays(new Date(), 29 - i), "yyyy-MM-dd"),
        sales: (Math.floor(Math.random() * 1000) + 500).toString(),
      })),
    }
  }

  // Safely access salesByDay with a fallback
  const salesByDay = stats?.salesByDay || []
  
  // Check if salesByDay has items before using it
  const chartData = salesByDay.length > 0
    ? {
        labels: salesByDay.map((day) => format(new Date(day.date), "MMM dd")),
        datasets: [
          {
            label: "Sales",
            data: salesByDay.map((day) => Number.parseFloat(day.sales || "0")),
            borderColor: "rgb(14, 165, 233)",
            backgroundColor: "rgba(14, 165, 233, 0.5)",
            tension: 0.3,
          },
        ],
      }
    : generateSampleData()

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Sales Overview",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  // Use stats data or fallback to sample data
  const statsData = stats || generateSampleStats()

  // Get recent orders from stats with a fallback to empty array
  const recentOrders: Order[] = statsData.recentOrders || []

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase">Total Users</p>
              <p className="text-2xl font-bold">{statsData.totalUsers}</p>
            </div>
            <div className="p-3 bg-white bg-opacity-30 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 4 0 0112 0v1zm0 0h6v-1a6 4 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>12% increase</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-secondary-500 to-secondary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase">Total Orders</p>
              <p className="text-2xl font-bold">{statsData.totalOrders}</p>
            </div>
            <div className="p-3 bg-white bg-opacity-30 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>8% increase</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase">Total Products</p>
              <p className="text-2xl font-bold">{statsData.totalProducts}</p>
            </div>
            <div className="p-3 bg-white bg-opacity-30 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>5% increase</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase">Total Revenue</p>
              <p className="text-2xl font-bold">${(statsData.totalRevenue / 1000).toFixed(1)}k</p>
            </div>
            <div className="p-3 bg-white bg-opacity-30 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>15% increase</span>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Sales Overview</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange("7days")}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  timeRange === "7days"
                    ? "bg-primary-100 text-primary-800"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange("30days")}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  timeRange === "30days"
                    ? "bg-primary-100 text-primary-800"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange("90days")}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  timeRange === "90days"
                    ? "bg-primary-100 text-primary-800"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                90 Days
              </button>
            </div>
          </div>
          <div className="h-80">
            <Line options={chartOptions} data={chartData} />
          </div>
        </Card>
      </div>

      {/* Recent Orders */}
      <div className="mt-8">
        <Card title="Recent Orders">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Order ID
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders && recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.user?.first_name} {order.user?.last_name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${
                            order.status === "delivered"
                              ? "bg-green-100 text-green-800"
                              : order.status === "shipped"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "processing"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : order.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.total.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No recent orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <a href="/orders" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              View all orders →
            </a>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default Dashboard