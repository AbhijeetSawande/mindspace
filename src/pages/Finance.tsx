import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, ReceiptText,
  Plus, Trash2, Bot, Send, Cpu, Calculator,
} from 'lucide-react'
import { useApp } from '@/store/appStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseCategory =
  | 'Food' | 'Transport' | 'Shopping' | 'Health'
  | 'Entertainment' | 'Bills' | 'EMI' | 'Savings' | 'Other'

interface Expense {
  id: string
  desc: string
  amount: number
  cat: ExpenseCategory
  date: string
  isIncome: boolean
}

type InvestmentType =
  | 'Stocks' | 'Mutual Fund' | 'FD' | 'PPF' | 'NPS' | 'Crypto' | 'Real Estate' | 'Other'

interface Investment {
  id: string
  name: string
  type: InvestmentType
  invested: number
  current: number
}

interface FinanceData {
  monthlyIncome: number
  monthlyBudget: number
  currency: string
  expenses: Expense[]
  investments: Investment[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'cortex-finance'
const GEMINI_KEY_LS = 'cortex-gemini-key'
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const CATEGORIES: ExpenseCategory[] = [
  'Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Bills', 'EMI', 'Savings', 'Other',
]

const INVESTMENT_TYPES: InvestmentType[] = [
  'Stocks', 'Mutual Fund', 'FD', 'PPF', 'NPS', 'Crypto', 'Real Estate', 'Other',
]

const CAT_COLORS: Record<ExpenseCategory, string> = {
  Food: 'bg-orange-400/20 text-orange-400',
  Transport: 'bg-blue-400/20 text-blue-400',
  Shopping: 'bg-pink-400/20 text-pink-400',
  Health: 'bg-green-400/20 text-green-400',
  Entertainment: 'bg-purple-400/20 text-purple-400',
  Bills: 'bg-red-400/20 text-red-400',
  EMI: 'bg-yellow-400/20 text-yellow-400',
  Savings: 'bg-teal-400/20 text-teal-400',
  Other: 'bg-gray-400/20 text-gray-400',
}

const FINANCE_SUGGESTIONS = [
  'How can I save more?',
  'Should I invest more?',
  'Am I on track for FIRE?',
  'Where am I overspending?',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadData(): FinanceData {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { monthlyIncome: 0, monthlyBudget: 0, currency: '₹', expenses: [], investments: [] }
    const parsed = JSON.parse(raw) as Partial<FinanceData>
    return {
      monthlyIncome: parsed.monthlyIncome ?? 0,
      monthlyBudget: parsed.monthlyBudget ?? 0,
      currency: parsed.currency ?? '₹',
      expenses: parsed.expenses ?? [],
      investments: parsed.investments ?? [],
    }
  } catch {
    return { monthlyIncome: 0, monthlyBudget: 0, currency: '₹', expenses: [], investments: [] }
  }
}

function saveData(data: FinanceData): void {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function currentMonthExpenses(expenses: Expense[]): Expense[] {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return expenses.filter(e => e.date.startsWith(ym))
}

function fmt(amount: number, currency: string): string {
  return `${currency}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({
  data,
  onUpdateIncomeAndBudget,
}: {
  data: FinanceData
  onUpdateIncomeAndBudget: (income: number, budget: number) => void
}) {
  const [editingSetup, setEditingSetup] = useState(false)
  const [incomeInput, setIncomeInput] = useState(data.monthlyIncome.toString())
  const [budgetInput, setBudgetInput] = useState(data.monthlyBudget.toString())

  const { currency } = data
  const monthExpenses = currentMonthExpenses(data.expenses)
  const spentThisMonth = monthExpenses.filter(e => !e.isIncome).reduce((s, e) => s + e.amount, 0)
  const incomeThisMonth = monthExpenses.filter(e => e.isIncome).reduce((s, e) => s + e.amount, 0)
  const totalIncome = data.monthlyIncome + incomeThisMonth
  const remaining = Math.max(0, data.monthlyBudget - spentThisMonth)
  const totalInvested = data.investments.reduce((s, i) => s + i.invested, 0)
  const savingsRate = totalIncome > 0 ? (((totalIncome - spentThisMonth) / totalIncome) * 100).toFixed(1) : '0'
  const budgetPct = data.monthlyBudget > 0 ? (spentThisMonth / data.monthlyBudget) * 100 : 0

  const catTotals: Partial<Record<ExpenseCategory, number>> = {}
  monthExpenses.filter(e => !e.isIncome).forEach(e => {
    catTotals[e.cat] = (catTotals[e.cat] ?? 0) + e.amount
  })
  const maxCat = Math.max(...Object.values(catTotals).map(v => v ?? 0), 1)

  function handleSave() {
    onUpdateIncomeAndBudget(parseFloat(incomeInput) || 0, parseFloat(budgetInput) || 0)
    setEditingSetup(false)
  }

  return (
    <div className="space-y-4">
      {/* Setup / Edit income & budget */}
      {(data.monthlyIncome === 0 || editingSetup) && (
        <div className="glass rounded-2xl p-4 border border-primary/20 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {data.monthlyIncome === 0 ? 'Set up your finances' : 'Update Income & Budget'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Monthly Income ({currency})</label>
              <input
                type="number"
                value={incomeInput}
                onChange={e => setIncomeInput(e.target.value)}
                placeholder="e.g. 100000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Monthly Budget ({currency})</label>
              <input
                type="number"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                placeholder="e.g. 60000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
          >
            Save
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Monthly Income', value: fmt(data.monthlyIncome, currency), icon: <TrendingUp className="w-4 h-4 text-green-400" />, color: 'text-green-400' },
          { label: 'Spent This Month', value: fmt(spentThisMonth, currency), icon: <ReceiptText className="w-4 h-4 text-red-400" />, color: 'text-red-400' },
          { label: 'Remaining', value: fmt(remaining, currency), icon: <Wallet className="w-4 h-4 text-blue-400" />, color: 'text-blue-400' },
          { label: 'Total Invested', value: fmt(totalInvested, currency), icon: <PiggyBank className="w-4 h-4 text-purple-400" />, color: 'text-purple-400' },
        ].map(card => (
          <div key={card.label} className="glass rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              {card.icon}
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className={cn('text-lg font-bold', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      {data.monthlyBudget > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Budget Usage</span>
            <span className={cn(
              'text-xs font-semibold',
              budgetPct > 90 ? 'text-red-400' : budgetPct > 70 ? 'text-yellow-400' : 'text-green-400'
            )}>
              {budgetPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', budgetPct > 90 ? 'bg-red-400' : budgetPct > 70 ? 'bg-yellow-400' : 'bg-green-400')}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Spent: {fmt(spentThisMonth, currency)}</span>
            <span>Budget: {fmt(data.monthlyBudget, currency)}</span>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {Object.keys(catTotals).length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Spending by Category</h3>
          <div className="space-y-2">
            {(Object.entries(catTotals) as [ExpenseCategory, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([cat, total]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-medium', CAT_COLORS[cat])}>{cat}</span>
                    <span className="text-foreground font-medium">{fmt(total, currency)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${(total / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Savings rate + edit button */}
      <div className="flex items-center gap-3">
        <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2 flex-1">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-xs text-muted-foreground">Savings Rate</span>
          <span className="text-sm font-bold text-green-400 ml-auto">{savingsRate}%</span>
        </div>
        <button
          onClick={() => { setEditingSetup(true); setIncomeInput(data.monthlyIncome.toString()); setBudgetInput(data.monthlyBudget.toString()) }}
          className="text-xs px-3 py-2.5 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          Edit Setup
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Expenses ────────────────────────────────────────────────────────────

function ExpensesTab({ data, onChange }: { data: FinanceData; onChange: (d: FinanceData) => void }) {
  const { currency } = data
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [cat, setCat] = useState<ExpenseCategory>('Food')
  const [date, setDate] = useState(todayISO())
  const [isIncome, setIsIncome] = useState(false)

  const monthExpenses = currentMonthExpenses(data.expenses)
  const monthSpent = monthExpenses.filter(e => !e.isIncome).reduce((s, e) => s + e.amount, 0)
  const monthInc = monthExpenses.filter(e => e.isIncome).reduce((s, e) => s + e.amount, 0)

  const recent = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30)

  function addExpense() {
    const amt = parseFloat(amount)
    if (!desc.trim() || isNaN(amt) || amt <= 0) return
    const newExp: Expense = { id: uid(), desc: desc.trim(), amount: amt, cat, date, isIncome }
    const updated: FinanceData = { ...data, expenses: [...data.expenses, newExp] }
    onChange(updated)
    setDesc(''); setAmount('')
  }

  function deleteExpense(id: string) {
    onChange({ ...data, expenses: data.expenses.filter(e => e.id !== id) })
  }

  return (
    <div className="space-y-4">
      {/* Monthly summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-red-400" />
          <div>
            <p className="text-[10px] text-muted-foreground">Spent this month</p>
            <p className="text-sm font-bold text-red-400">{fmt(monthSpent, currency)}</p>
          </div>
        </div>
        <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-[10px] text-muted-foreground">Income this month</p>
            <p className="text-sm font-bold text-green-400">{fmt(monthInc, currency)}</p>
          </div>
        </div>
      </div>

      {/* Add form */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add Entry
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Description"
            className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Amount (${currency})`}
            min={0}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          />
          <select
            value={cat}
            onChange={e => setCat(e.target.value as ExpenseCategory)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={isIncome}
              onChange={e => setIsIncome(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-xs text-muted-foreground">Mark as Income</span>
          </label>
        </div>
        <button
          onClick={addExpense}
          className="w-full py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          Add Entry
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {recent.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No expenses logged yet.
          </div>
        )}
        {recent.map(exp => (
          <div key={exp.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground truncate">{exp.desc}</p>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-medium', CAT_COLORS[exp.cat])}>{exp.cat}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{exp.date}</p>
            </div>
            <span className={cn('text-sm font-bold shrink-0', exp.isIncome ? 'text-green-400' : 'text-red-400')}>
              {exp.isIncome ? '+' : '-'}{fmt(exp.amount, currency)}
            </span>
            <button
              onClick={() => deleteExpense(exp.id)}
              className="text-muted-foreground/50 hover:text-red-400 transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Investments ─────────────────────────────────────────────────────────

function InvestmentsTab({ data, onChange }: { data: FinanceData; onChange: (d: FinanceData) => void }) {
  const { currency } = data
  const [name, setName] = useState('')
  const [type, setType] = useState<InvestmentType>('Mutual Fund')
  const [invested, setInvested] = useState('')
  const [current, setCurrent] = useState('')

  const totalInvested = data.investments.reduce((s, i) => s + i.invested, 0)
  const totalCurrent = data.investments.reduce((s, i) => s + i.current, 0)
  const overallGain = totalCurrent - totalInvested
  const overallGainPct = totalInvested > 0 ? ((overallGain / totalInvested) * 100).toFixed(2) : '0'

  function addInvestment() {
    const inv = parseFloat(invested)
    const cur = parseFloat(current)
    if (!name.trim() || isNaN(inv) || inv <= 0) return
    const newInv: Investment = { id: uid(), name: name.trim(), type, invested: inv, current: isNaN(cur) ? inv : cur }
    onChange({ ...data, investments: [...data.investments, newInv] })
    setName(''); setInvested(''); setCurrent('')
  }

  function deleteInvestment(id: string) {
    onChange({ ...data, investments: data.investments.filter(i => i.id !== id) })
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Invested', value: fmt(totalInvested, currency), color: 'text-foreground' },
          { label: 'Current Value', value: fmt(totalCurrent, currency), color: 'text-blue-400' },
          { label: 'Overall Gain', value: `${overallGain >= 0 ? '+' : ''}${fmt(overallGain, currency)} (${overallGainPct}%)`, color: overallGain >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">{s.label}</p>
            <p className={cn('text-sm font-bold break-words', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add Investment
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name (e.g. Nifty 50 Fund)"
            className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <select
            value={type}
            onChange={e => setType(e.target.value as InvestmentType)}
            className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/40"
          >
            {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="number"
            value={invested}
            onChange={e => setInvested(e.target.value)}
            placeholder={`Invested (${currency})`}
            min={0}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <input
            type="number"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder={`Current value (${currency})`}
            min={0}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
        <button
          onClick={addInvestment}
          className="w-full py-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
        >
          Add Investment
        </button>
      </div>

      {/* Investment list */}
      <div className="space-y-2">
        {data.investments.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No investments added yet.
          </div>
        )}
        {data.investments.map(inv => {
          const gain = inv.current - inv.invested
          const gainPct = inv.invested > 0 ? ((gain / inv.invested) * 100).toFixed(2) : '0'
          return (
            <div key={inv.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{inv.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/15 text-primary border border-primary/20 shrink-0">{inv.type}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Invested: {fmt(inv.invested, currency)}</span>
                  <span className="text-[10px] text-muted-foreground">Now: {fmt(inv.current, currency)}</span>
                  <span className={cn('text-[10px] font-medium', gain >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {gain >= 0 ? '+' : ''}{fmt(gain, currency)} ({gain >= 0 ? '+' : ''}{gainPct}%)
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteInvestment(inv.id)}
                className="text-muted-foreground/50 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab: FIRE Calculator ─────────────────────────────────────────────────────

function FIRETab({ data }: { data: FinanceData }) {
  const { currency } = data
  const monthlyExpenses = currentMonthExpenses(data.expenses)
    .filter(e => !e.isIncome)
    .reduce((s, e) => s + e.amount, 0)

  const [income, setIncome] = useState(data.monthlyIncome > 0 ? data.monthlyIncome.toString() : '')
  const [expenses, setExpenses] = useState(monthlyExpenses > 0 ? monthlyExpenses.toString() : '')
  const [returnRate, setReturnRate] = useState('12')

  const inc = parseFloat(income) || 0
  const exp = parseFloat(expenses) || 0
  const rate = parseFloat(returnRate) || 12
  const annualExpenses = exp * 12
  const targetCorpus = annualExpenses * 25  // 4% withdrawal rule
  const monthlySavings = inc - exp
  const totalInvested = data.investments.reduce((s, i) => s + i.current, 0)
  const isAlreadyFI = totalInvested >= targetCorpus && targetCorpus > 0

  // Years to FIRE using FV formula: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
  // Solve for n: we iterate
  function calcYearsToFIRE(): number | null {
    if (monthlySavings <= 0 || targetCorpus <= 0) return null
    const r = rate / 100 / 12
    let pv = totalInvested
    for (let month = 1; month <= 600; month++) {
      pv = pv * (1 + r) + monthlySavings
      if (pv >= targetCorpus) return Math.round(month / 12 * 10) / 10
    }
    return null
  }

  const yearsToFIRE = inc > 0 && exp > 0 ? calcYearsToFIRE() : null

  return (
    <div className="space-y-4 max-w-lg">
      <div className="glass rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" /> FIRE Calculator
        </h3>
        <p className="text-xs text-muted-foreground">Financial Independence, Retire Early — based on the 4% withdrawal rule.</p>

        {[
          { label: `Monthly Income (${currency})`, value: income, setValue: setIncome, placeholder: '100000' },
          { label: `Monthly Expenses (${currency})`, value: expenses, setValue: setExpenses, placeholder: '60000' },
          { label: 'Annual Return Rate (%)', value: returnRate, setValue: setReturnRate, placeholder: '12' },
        ].map(field => (
          <div key={field.label}>
            <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
            <input
              type="number"
              value={field.value}
              onChange={e => field.setValue(e.target.value)}
              placeholder={field.placeholder}
              min={0}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
          </div>
        ))}
      </div>

      {inc > 0 && exp > 0 && (
        <div className="space-y-3">
          {isAlreadyFI ? (
            <div className="glass rounded-2xl p-6 text-center border border-green-400/25 space-y-2">
              <p className="text-3xl">🎉</p>
              <p className="text-lg font-bold text-green-400">You are financially independent!</p>
              <p className="text-xs text-muted-foreground">Your current investments already cover your FIRE target.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Annual Expenses', value: fmt(annualExpenses, currency), color: 'text-red-400' },
                  { label: 'FIRE Target (25x)', value: fmt(targetCorpus, currency), color: 'text-yellow-400' },
                  { label: 'Monthly Savings', value: fmt(Math.max(0, monthlySavings), currency), color: monthlySavings >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: 'Current Investments', value: fmt(totalInvested, currency), color: 'text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="glass rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">{s.label}</p>
                    <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="glass rounded-2xl p-5 text-center border border-primary/20 space-y-2">
                {yearsToFIRE !== null ? (
                  <>
                    <p className="text-xs text-muted-foreground">Estimated years to FIRE</p>
                    <p className="text-4xl font-bold text-primary">{yearsToFIRE}</p>
                    <p className="text-sm text-muted-foreground">years at {currency}{monthlySavings.toLocaleString('en-IN')}/month savings</p>
                    <p className="text-[10px] text-muted-foreground">Assuming {rate}% annual returns, compounded monthly</p>
                  </>
                ) : monthlySavings <= 0 ? (
                  <p className="text-sm text-red-400">Your expenses exceed income. Reduce spending to start FIRE journey.</p>
                ) : (
                  <p className="text-sm text-yellow-400">FIRE target is unreachable at current trajectory within 50 years.</p>
                )}
              </div>

              {yearsToFIRE !== null && (
                <div className="glass rounded-xl px-4 py-3">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${Math.min(100, totalInvested > 0 ? (totalInvested / targetCorpus) * 100 : 0)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
                    {totalInvested > 0 ? ((totalInvested / targetCorpus) * 100).toFixed(1) : 0}% of corpus accumulated
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(inc === 0 || exp === 0) && (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Enter your income and monthly expenses to calculate your FIRE date.
        </div>
      )}
    </div>
  )
}

// ─── Tab: AI Advisor ──────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

function AIAdvisorTab({ data }: { data: FinanceData }) {
  const { setPage } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const apiKey = localStorage.getItem(GEMINI_KEY_LS) || ''
  const hasKey = Boolean(apiKey)
  const { currency } = data

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function buildContext(): string {
    const monthExpenses = currentMonthExpenses(data.expenses)
    const spentThisMonth = monthExpenses.filter(e => !e.isIncome).reduce((s, e) => s + e.amount, 0)
    const savingsRate = data.monthlyIncome > 0
      ? (((data.monthlyIncome - spentThisMonth) / data.monthlyIncome) * 100).toFixed(1)
      : '0'
    const totalInvested = data.investments.reduce((s, i) => s + i.invested, 0)
    const totalCurrent = data.investments.reduce((s, i) => s + i.current, 0)

    return [
      'You are Mindspace Finance AI, a personal finance advisor for an Indian user. Be concise, practical, and use Indian financial context (₹, Indian tax laws, mutual funds, SIP, PPF, etc.).',
      '',
      `Monthly income: ${currency}${data.monthlyIncome.toLocaleString('en-IN')}`,
      `Monthly budget: ${currency}${data.monthlyBudget.toLocaleString('en-IN')}`,
      `Spent this month: ${currency}${spentThisMonth.toLocaleString('en-IN')}`,
      `Savings rate: ${savingsRate}%`,
      `Total invested: ${currency}${totalInvested.toLocaleString('en-IN')}`,
      `Current portfolio value: ${currency}${totalCurrent.toLocaleString('en-IN')}`,
      `Investment types: ${data.investments.map(i => i.type).join(', ') || 'none'}`,
    ].join('\n')
  }

  async function send(userText?: string) {
    const text = (userText ?? input).trim()
    if (!text || loading || !hasKey) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const systemCtx = buildContext()
      const contents = history.map((m, idx) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: idx === 0 && m.role === 'user' ? systemCtx + '\n\nUser: ' + m.text : m.text }],
      }))
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }
      const responseData = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      const reply = responseData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.'
      setMessages([...history, { id: (Date.now() + 1).toString(), role: 'assistant', text: reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get response.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[520px]">
      <div className="glass rounded-2xl p-3 flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Finance AI Advisor</p>
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Gemini 2.0 Flash</span>
              <span className={cn('w-1.5 h-1.5 rounded-full', hasKey ? 'bg-green-400' : 'bg-red-400')} />
            </div>
          </div>
        </div>
      </div>

      {!hasKey && (
        <div className="glass rounded-xl p-3 mb-3 flex items-center justify-between border border-yellow-400/25 shrink-0">
          <p className="text-xs text-yellow-400">Add Gemini API key in Settings to enable AI</p>
          <button
            onClick={() => setPage('settings')}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400/15 text-yellow-400 border border-yellow-400/25 hover:bg-yellow-400/25 transition-colors ml-2 shrink-0"
          >
            Settings
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pb-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <Bot className="w-10 h-10 text-primary/50" />
            <p className="text-xs text-muted-foreground">Get personalized financial advice based on your income, expenses, and investments.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {FINANCE_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  disabled={!hasKey}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary/20 border border-primary/25 text-foreground rounded-tr-sm'
                  : 'glass border border-white/10 text-foreground rounded-tl-sm'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-3 py-2 border border-white/10">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="glass rounded-xl p-2 border border-red-400/25 text-xs text-red-400 text-center">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="glass rounded-xl p-2.5 flex items-end gap-2 shrink-0 mt-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={hasKey ? 'Ask about your finances...' : 'Add API key in Settings'}
          disabled={!hasKey || loading}
          rows={1}
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          disabled={!hasKey || loading || !input.trim()}
          className="p-2 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FinanceTab = 'overview' | 'expenses' | 'investments' | 'fire' | 'ai'

const TABS: { id: FinanceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'investments', label: 'Investments' },
  { id: 'fire', label: 'FIRE' },
  { id: 'ai', label: 'AI Advisor' },
]

export function Finance() {
  const [tab, setTab] = useState<FinanceTab>('overview')
  const [data, setData] = useState<FinanceData>(loadData)

  function handleChange(updated: FinanceData) {
    setData(updated)
    saveData(updated)
  }

  function handleUpdateIncomeAndBudget(income: number, budget: number) {
    handleChange({ ...data, monthlyIncome: income, monthlyBudget: budget })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track expenses, investments, and your path to financial freedom</p>
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl p-1 flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all min-w-[60px]',
              tab === t.id
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && <OverviewTab data={data} onUpdateIncomeAndBudget={handleUpdateIncomeAndBudget} />}
      {tab === 'expenses' && <ExpensesTab data={data} onChange={handleChange} />}
      {tab === 'investments' && <InvestmentsTab data={data} onChange={handleChange} />}
      {tab === 'fire' && <FIRETab data={data} />}
      {tab === 'ai' && <AIAdvisorTab data={data} />}
    </div>
  )
}
