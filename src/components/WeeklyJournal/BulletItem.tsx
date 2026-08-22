import React from 'react';
import { JournalEntryCard, JournalEntryCardProps } from './JournalEntryCard';

export type BulletItemProps = JournalEntryCardProps;

export const BulletItem: React.FC<BulletItemProps> = React.memo((props) => {
  return <JournalEntryCard {...props} />;
});

export { JournalEntryCard };
