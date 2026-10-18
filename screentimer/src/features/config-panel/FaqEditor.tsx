import { useRef, useState, type FormEvent } from 'react'
import { questionKey } from '../../sources/faqEdits'
import type { ScreenData } from '../../sources/useScreenData'
import { MAX_FAQ_ENTRIES, validateFaqEntry } from '../faq/parseFaq'
import styles from './ConfigPanel.module.css'
import { MarkdownToolbar } from './MarkdownToolbar'

/** Hides questions of the FAQ source and adds questions, on this screen only. */
export function FaqEditor({ data }: { data: ScreenData }) {
  const { sourceFaq, page, actions } = data
  const { added, hidden } = page.faqEdits
  const hiddenKeys = new Set(hidden)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const full = added.length >= MAX_FAQ_ENTRIES
  const questionInput = useRef<HTMLInputElement>(null)
  const answerInput = useRef<HTMLTextAreaElement>(null)

  const add = (e: FormEvent) => {
    e.preventDefault()
    const entry = validateFaqEntry(question, answer)
    if (!entry) {
      setError('Question attendue')
      return
    }
    actions.addFaq(entry)
    setQuestion('')
    setAnswer('')
    setError('')
  }

  return (
    <section className={styles.section}>
      <h3>FAQ</h3>
      {sourceFaq.length === 0 && added.length === 0 && <p className={styles.hint}>Aucune question.</p>}

      <ul className={styles.faqList}>
        {sourceFaq.map((entry, index) => {
          const isHidden = hiddenKeys.has(questionKey(entry.question))
          return (
            <li key={`source-${index}`} className={styles.faqItem} data-hidden={isHidden || undefined}>
              <FaqText question={entry.question} answer={entry.answer} />
              <button type="button" onClick={() => actions.setFaqHidden(entry.question, !isHidden)}>
                {isHidden ? 'Afficher' : 'Masquer'}
              </button>
            </li>
          )
        })}
        {added.map((entry, index) => (
          <li key={`added-${index}`} className={styles.faqItem}>
            <FaqText question={entry.question} answer={entry.answer} badge="ajoutée ici" />
            <button type="button" onClick={() => actions.removeAddedFaq(index)}>
              Supprimer
            </button>
          </li>
        ))}
      </ul>

      <form className={styles.form} onSubmit={add}>
        <div className={styles.field} data-wide={true}>
          <div className={styles.fieldHeader}>
            <label htmlFor="faq-question">Nouvelle question</label>
            <MarkdownToolbar target={questionInput} onEdit={setQuestion} />
          </div>
          <input
            id="faq-question"
            ref={questionInput}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <div className={styles.field} data-wide={true}>
          <div className={styles.fieldHeader}>
            <label htmlFor="faq-answer">Réponse (vide : en attente)</label>
            <MarkdownToolbar target={answerInput} onEdit={setAnswer} headings />
          </div>
          <textarea
            id="faq-answer"
            ref={answerInput}
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>
        <div className={styles.inline}>
          <button type="submit" disabled={!question.trim() || full}>
            Ajouter la question
          </button>
          {full && <p className={styles.error}>{MAX_FAQ_ENTRIES} questions ajoutées au maximum</p>}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </form>
    </section>
  )
}

function FaqText({ question, answer, badge }: { question: string; answer: string; badge?: string }) {
  return (
    <div className={styles.faqText}>
      <strong>
        {question}
        {badge && <span className={styles.badge}>{badge}</span>}
      </strong>
      <span>{answer || 'En attente de réponse'}</span>
    </div>
  )
}
