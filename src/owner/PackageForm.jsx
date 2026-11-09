import { run } from '../shared/lib';
export const CATS = ['Main dish', 'Side', 'Dessert', 'Drinks'];
export const pbody = (f) => {
  if (+f.min.value > +f.max.value) throw new Error('Min guests cannot exceed max guests.');
  return {
    name: f.name.value.trim(),
    price: +f.price.value,
    min_guests: +f.min.value,
    max_guests: +f.max.value,
    description: f.description.value.trim(),
    inclusions: f.inc.value
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
    tables_chairs: f.tc.value,
    is_customizable: f.cust.checked,
  };
};
export function PkgForm({ p = {}, label, onSave }) {
  return (
    <form
      key={p.updated_at}
      onSubmit={run(async (e) => {
        await onSave(pbody(e.target));
      })}
    >
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
      <br />
      <button className="btn">{label}</button>
    </form>
  );
}
