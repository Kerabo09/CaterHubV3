export const Chips = ({ l }) => (
  <div className="chips">
    {l.map((e) => (
      <span className="chip" key={e}>
        {e}
      </span>
    ))}
  </div>
);
