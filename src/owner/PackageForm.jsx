import { run } from '../shared/lib';
export const CATS = ['Main dish', 'Side', 'Dessert', 'Drinks'];
export const pbody = (f) => {
  const g = (k) => f.elements.namedItem(k);
  if (+g('min').value > +g('max').value) throw new Error('Min guests cannot exceed max guests.');
  return {
    name: g('name').value.trim(),
    price: +g('price').value,
    min_guests: +g('min').value,
    max_guests: +g('max').value,
    description: g('description').value.trim(),
    inclusions: g('inc')
      .value.split(',')
      .map((a) => a.trim())
      .filter(Boolean),
    tables_chairs: g('tc').value,
    is_customizable: g('cust').checked,
  };
};
// bare: only the fields, no <form> and no button (used inside the Edit package form,
// where one Save changes button at the bottom saves the fields, menu and photos together)
export function PkgForm({ p = {}, label, onSave, bare }) {
  const fields = (
    <>
      <div className="form2">
        <div>
          <label>Name *</label>
          <input name="name" defaultValue={p.name} required />
        </div>
        <div>
          <label>Price per head (₱) *</label>
          <input type="number" name="price" min="1" step="0.01" defaultValue={p.price} required />
        </div>
        <div>
          <label>Min guests *</label>
          <input type="number" name="min" min="1" defaultValue={p.min_guests} required />
        </div>
        <div>
          <label>Max guests *</label>
          <input type="number" name="max" min="1" defaultValue={p.max_guests} required />
        </div>
      </div>
      <label>Description *</label>
      <textarea name="description" rows="2" defaultValue={p.description || ''} required />
      <label>Inclusions (comma separated)</label>
      <input name="inc" defaultValue={(p.inclusions || []).join(', ')} />
      <label>Tables and chairs</label>
      <select name="tc" defaultValue={p.tables_chairs || 'Optional'}>
        <option>Optional</option>
        <option>Included</option>
      </select>
      <label className="chk">
        <input type="checkbox" name="cust" defaultChecked={p.is_customizable} />
        Customizable
      </label>
    </>
  );
  if (bare) return <div>{fields}</div>;
  return (
    <form
      key={p.updated_at}
      onSubmit={run(async (e) => {
        await onSave(pbody(e.target));
      })}
    >
      {fields}
      <br />
      <button className="btn">{label}</button>
    </form>
  );
}
