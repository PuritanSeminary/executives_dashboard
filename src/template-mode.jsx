// template-mode.jsx — Tpl helper component.
//
// Always renders the placeholder label, regardless of layout. The dashboard
// itself IS a template — prose copy is held as named slots so a writer can
// fill them in later. Data stays live, but every piece of copy renders as
// [SLOT NAME · optional hint].
//
// Usage:
//   <Tpl slot="HEADLINE" />
//   <Tpl slot="SECTION INTRO" hint="1 sentence under the rule" inline />

function Tpl({ slot, hint, inline }) {
  const Tag = inline ? 'span' : 'div';
  // Render in sentence case so placeholders read like natural filler.
  const text = slot.charAt(0) + slot.slice(1).toLowerCase();
  return (
    <Tag className={'tpl ' + (inline ? 'tpl--inline' : 'tpl--block')}>
      {text}
      {hint && <span className="tpl__hint"> — {hint}</span>}
    </Tag>
  );
}

Object.assign(window, { Tpl });
