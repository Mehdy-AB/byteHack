'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ReportIncidentPage() {
  const [description, setDescription] = useState('')
  const [department, setDepartment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!description || description.trim().length < 10) {
      toast.error('Please provide more details about what happened.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, department, isAnonymous }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report')
      }

      toast.success('Report submitted successfully!')
      setSubmitted(true)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-full max-w-lg bg-[#111827] border border-green-900/50 rounded-xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Report Received</h2>
          <p className="text-[#6b7280] mb-6">
            Thank you for reporting this. You did the right thing. Our automated Security Operations Center is already analyzing the incident and will take immediate action.
          </p>
          <button 
            onClick={() => {
              setSubmitted(false)
              setDescription('')
            }}
            className="text-blue-500 hover:text-blue-400 text-sm font-medium transition-colors"
          >
            Submit another report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <span className="text-3xl font-bold text-red-500">⚠ Incident Report</span>
          <p className="text-[#6b7280] text-sm mt-3 max-w-md mx-auto">
            If you clicked a suspicious link, lost a device, or noticed strange behavior, report it here. 
            <span className="text-white font-medium block mt-1">This is a blame-free zone. The faster we know, the faster we can protect the network.</span>
          </p>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                What happened? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: I received an email from 'IT Support' and clicked the link, but it asked for my password and the website looked strange. My computer is now running very slowly."
                className="w-full bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-red-500 placeholder-[#4b5563] transition-colors min-h-[160px] resize-y"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wider mb-2">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Finance, HR, Engineering"
                  className="w-full bg-[#0d1117] border border-[#1f2937] text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 placeholder-[#4b5563] transition-colors"
                />
              </div>

              <div className="flex items-center mt-6 md:mt-0">
                <div className="flex items-center h-5">
                  <input
                    id="anonymous"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 bg-[#0d1117] border-[#1f2937] rounded text-red-500 focus:ring-red-500 focus:ring-offset-[#111827]"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="anonymous" className="font-medium text-white">Report Anonymously</label>
                  <p className="text-[#6b7280] text-xs mt-0.5">Your identity will not be logged in the SOAR system.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-900 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-medium transition-colors mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting to SOC AI...
                </>
              ) : (
                'Submit Incident Report'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
