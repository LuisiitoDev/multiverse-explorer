type FilterTextFieldProps = Readonly<{
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}>

function FilterTextField({ id, label, value, placeholder, onChange }: FilterTextFieldProps) {
  return (
    <div className="filter-field">
      <label htmlFor={id} className="filter-field__label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="filter-field__input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export default FilterTextField
