import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { Utensils, Search, Filter, Clock, ChefHat, Plus, X, Sun, Moon, Sunrise } from 'lucide-react'
import './MealPlanner.css'

const FILTERS = [
  { key: 'all', label: 'All', icon: Utensils },
  { key: 'breakfast', label: 'Breakfast', icon: Sunrise },
  { key: 'lunch', label: 'Lunch', icon: Sun },
  { key: 'dinner', label: 'Dinner', icon: Moon },
  { key: 'snack', label: 'Snack', icon: ChefHat },
]

const MEAL_TYPE_COLORS = {
  breakfast: '#f97316',
  lunch: '#3b82f6',
  dinner: '#8b5cf6',
  snack: '#22c55e',
}

export default function MealPlanner() {
  const { showToast } = useToast()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState(null)

  useEffect(() => {
    apiFetch('/recipes')
      .then(data => setRecipes(data))
      .catch(() => showToast('Error loading recipes'))
      .finally(() => setLoading(false))
    }, [showToast])

  const filteredRecipes = recipes.filter(r => {
    const matchesMeal = activeFilter === 'all' || r.mealType === activeFilter
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesMeal && matchesSearch
  })

  function openModal(recipe) {
    setSelectedRecipe(recipe)
  }

  function closeModal() {
    setSelectedRecipe(null)
  }

  if (loading) {
    return (
      <div className="mp-container">
        <div className="mp-loading">
          <div className="mp-spinner" />
          <span>Loading recipes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mp-container">
      <div className="mp-header">
        <h2 className="mp-title"><Utensils size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />Meal Planner</h2>
      </div>

      <div className="mp-controls">
        <div className="mp-search-bar">
          <Search size={16} className="mp-search-icon" />
          <input
            className="mp-search-input"
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="mp-clear-search" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mp-filters">
          <Filter size={14} className="mp-filter-icon" />
          {FILTERS.map(f => {
            const Icon = f.icon
            return (
              <button
                key={f.key}
                className={'mp-filter-btn' + (activeFilter === f.key ? ' mp-filter-active' : '')}
                onClick={() => setActiveFilter(f.key)}
              >
                <Icon size={14} />
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="mp-empty">No recipes found</div>
      ) : (
        <div className="mp-grid">
          {filteredRecipes.map(r => (
            <div key={r.id} className="mp-card" onClick={() => openModal(r)}>
              <div className="mp-card-header">
                <span className="mp-card-name">{r.name}</span>
                <span
                  className="mp-meal-badge"
                  style={{ background: MEAL_TYPE_COLORS[r.mealType] + '22', color: MEAL_TYPE_COLORS[r.mealType], borderColor: MEAL_TYPE_COLORS[r.mealType] + '44' }}
                >
                  {r.mealType}
                </span>
              </div>

              <div className="mp-card-macros">
                <div className="mp-macro-badge" style={{ background: '#f9731622', color: '#f97316', borderColor: '#f9731644' }}>
                  {r.calories || 0} kcal
                </div>
              </div>

              <div className="mp-card-details">
                <span className="mp-detail-item">
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {r.prepTime || 'N/A'}
                </span>
                <span className="mp-detail-item">
                  <ChefHat size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {r.difficulty || 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRecipe && (
        <div className="mp-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="mp-modal">
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">{selectedRecipe.name}</h3>
              <button className="mp-modal-close" onClick={closeModal}><X size={20} /></button>
            </div>

            <div className="mp-modal-body">
              <div className="mp-modal-meta">
                <span
                  className="mp-meal-badge mp-badge-lg"
                  style={{ background: MEAL_TYPE_COLORS[selectedRecipe.mealType] + '22', color: MEAL_TYPE_COLORS[selectedRecipe.mealType], borderColor: MEAL_TYPE_COLORS[selectedRecipe.mealType] + '44' }}
                >
                  {selectedRecipe.mealType}
                </span>
                <span className="mp-detail-item">
                  <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {selectedRecipe.prepTime || 'N/A'}
                </span>
                <span className="mp-detail-item">
                  <ChefHat size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {selectedRecipe.difficulty || 'N/A'}
                </span>
              </div>

              <div className="mp-macro-breakdown">
                <div className="mp-macro-item" style={{ background: '#f9731611', borderColor: '#f9731633' }}>
                  <span className="mp-macro-label" style={{ color: '#f97316' }}>Protein</span>
                  <span className="mp-macro-value">{selectedRecipe.protein || 0}g</span>
                </div>
                <div className="mp-macro-item" style={{ background: '#3b82f611', borderColor: '#3b82f633' }}>
                  <span className="mp-macro-label" style={{ color: '#3b82f6' }}>Carbs</span>
                  <span className="mp-macro-value">{selectedRecipe.carbs || 0}g</span>
                </div>
                <div className="mp-macro-item" style={{ background: '#8b5cf611', borderColor: '#8b5cf633' }}>
                  <span className="mp-macro-label" style={{ color: '#8b5cf6' }}>Fat</span>
                  <span className="mp-macro-value">{selectedRecipe.fat || 0}g</span>
                </div>
                <div className="mp-macro-item mp-macro-total" style={{ borderColor: '#2a2a35' }}>
                  <span className="mp-macro-label">Calories</span>
                  <span className="mp-macro-value">{selectedRecipe.calories || 0}</span>
                </div>
              </div>

              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div className="mp-section">
                  <h4 className="mp-section-title">Ingredients</h4>
                  <ul className="mp-ingredients-list">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li key={i} className="mp-ingredient-item">{ing}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecipe.instructions && (
                <div className="mp-section">
                  <h4 className="mp-section-title">Instructions</h4>
                  <p className="mp-instructions">{selectedRecipe.instructions}</p>
                </div>
              )}
            </div>

            <div className="mp-modal-footer">
              <button className="mp-btn mp-btn-primary" onClick={closeModal}>
                <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Add to Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
