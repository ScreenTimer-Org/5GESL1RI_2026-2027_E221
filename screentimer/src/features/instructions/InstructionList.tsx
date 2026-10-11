import styles from './InstructionList.module.css'

export function InstructionList({ items }: { items: string[] }) {
  return (
    <ol className={styles.list}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ol>
  )
}
