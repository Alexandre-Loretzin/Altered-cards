import { Gallery } from './gallery';
import data from '../data/cards.json';

export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Gallery data={data as any} />;
}
