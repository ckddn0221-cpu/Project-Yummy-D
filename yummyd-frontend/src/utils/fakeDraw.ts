/* data폴더와 동일하게 임시로 작업을 위한 로직 함수를 저장하기 위한 공간 */
import { Avatars } from '../../../yummyd-backend/data/Avatar';
type Grade = 'common' | 'rare' | 'unique' | 'epic';

type Item = {
  id: number;
  name: string;
  grade: 'common' | 'rare' | 'unique' | 'epic';
  item_type?: string;
  image_url?: string; // 추가
  video_url?: string; // 추가
};

const RATE = {
  common: 40,
  rare: 30,
  unique:20,
  epic: 10
};

const getRandomGrade = (): Grade => {
  const rand = Math.random() * 100;

  if (rand < RATE.common) return "common";
  if (rand < RATE.common + RATE.rare) return "rare";
  if (rand < RATE.common + RATE.rare + RATE.unique) return "unique";
  return "epic";
};

export const fakeDraw = (
  collection: { id: number }[]
): { success: boolean; item?: Item; message?: string } => {
  const ownedIds = collection.map(i => i.id);

  const available = Avatars.filter(item => !ownedIds.includes(item.id));

  if (available.length === 0) {
    return { success: false, message: "모든 아바타를 이미 가지고 있어요!" };
  }

  const grade = getRandomGrade();

  let pool = available.filter(item => item.grade === grade);

  if (pool.length === 0) {
    pool = available;
  }

  const item = pool[Math.floor(Math.random() * pool.length)];

  if (!item) {
    return { success: false, message: "아이템 생성 실패" };
  }

  return { success: true, item };
};