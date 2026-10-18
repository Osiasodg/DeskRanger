export default function NoteBody({ fence, ctx }) {
  return (
    <textarea
      className="note"
      value={fence.note}
      placeholder="Écrivez une note, une liste, un mot de passe Wi-Fi…"
      spellCheck={false}
      onChange={(e) => ctx.actions.updateFence(fence.id, { note: e.target.value })}
    />
  );
}
