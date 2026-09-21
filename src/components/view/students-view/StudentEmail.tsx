import { Fragment } from 'react'

export function StudentEmail({ email }: { email: string }) {
  return email.split(/([@.])/).map((part, index) => {
    if (part !== '@' && part !== '.') return part
    return (
      <Fragment key={`${part}-${index}`}>
        {part}
        <wbr />
      </Fragment>
    )
  })
}
