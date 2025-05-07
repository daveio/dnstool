// Types for DNS Analysis Data

export interface StatsOverview {
  total_queries: number
  unique_domains: number
  unique_base_domains: number
  unique_ips: number
  source_distribution: Array<{ source: string; count: number }>
  status_distribution: Array<{ status: string; count: number }>
  query_type_distribution?: Array<{ type: string; count: number }>
  time_range: {
    start: string
    end: string
    duration_hours: number
  }
}

export interface Device {
  ip: string
  query_count: number
  unique_domains: number
  blocked_count: number
  blocked_percentage: number
}

export interface Devices {
  devices: Device[]
}

export interface TimeSeriesData {
  hourly_distribution: Array<{ hour: string; count: number }>
  query_type_distribution: Array<{ type: string; count: number }>
  status_distribution?: Array<{ status: string; count: number }>
}

export interface SuspiciousDomain {
  domain: string
  timestamp: string
  source_ip: string
  status: string
  matchedPattern: string
}

export interface Relationships {
  ip_to_domains: Array<{
    ip: string
    domains: Array<{ domain: string; count: number }>
    total_lookups: number
    unique_domains: number
  }>
  domain_to_ips: Array<{
    domain: string
    ips: Array<{ ip: string; count: number }>
    total_lookups: number
    unique_ips: number
  }>
}

export interface AnalysisData {
  stats: StatsOverview
  devices: Devices
  time_series: TimeSeriesData
  suspicious_domains: SuspiciousDomain[]
  relationships: Relationships
}
