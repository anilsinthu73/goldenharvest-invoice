import axios from 'axios'

const API_BASE = '/api'

export const getInvoices = async () => {
  const response = await axios.get(`${API_BASE}/invoices`)
  return response.data
}

export const getInvoiceById = async (id) => {
  const response = await axios.get(`${API_BASE}/invoices/${id}`)
  return response.data
}

export const createInvoice = async (invoiceData) => {
  const response = await axios.post(`${API_BASE}/invoices`, invoiceData)
  return response.data
}

export const updateInvoice = async (id, invoiceData) => {
  const response = await axios.put(`${API_BASE}/invoices/${id}`, invoiceData)
  return response.data
}

export const generatePDF = async (invoiceId) => {
  const response = await axios.post(`${API_BASE}/invoices/${invoiceId}/pdf`, {}, {
    responseType: 'blob'
  })
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `invoice-${invoiceId}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}