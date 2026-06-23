import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 実績画面コンポーネントの Props。
 * ページ表示でも使えるように onClose は任意にしている。
 */
type CollectionListPageProps = {
  onClose?: () => void
};

/**
 * 実績一覧 API から返ってくるレスポンス型。
 */
type CollectionListResponse = {
  completedTaskCount?: number
  progressRate?: number
  availableGachaCount?: number
  canGacha?: boolean
  collections?: CollectionItem[]
};

/**
 * コレクション 1 件分の表示データ。
 */
type CollectionItem = {
  collectionId: number
  name: string
  description: string
  imageKey?: string
  imagekey?: string
  rarity: string
  getDate: string | null
  acquired: boolean
};

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '';
const ASSET_BASE = '/images/achievement-view';

/**
 * 実績画面で使用する画像素材。
 */
const forestAssets = {
  jar: `${ASSET_BASE}/achievement_jar_empty.png`,
  progress: `${ASSET_BASE}/achievement_honey_progress.png`,
  bearNormal: `${ASSET_BASE}/achievement_bear_normal.png`,
  bearReady: `${ASSET_BASE}/achievement_bear_ready.png`,
  frame: `${ASSET_BASE}/achievement_collection_frame.png`,
  forestLeft: `${ASSET_BASE}/achievement_forest_left.png`,
  forestRight: `${ASSET_BASE}/achievement_forest_right.png`,
  gachaBoard: `${ASSET_BASE}/achievement_gacha_board.png`,
  cornerTopLeft: `${ASSET_BASE}/achievement_corner_top_left.png`,
  cornerTopRight: `${ASSET_BASE}/achievement_corner_top_right.png`,
};

/**
 * API 取得に失敗した場合の表示確認用データ。
 */
const MOCK_COLLECTIONS: CollectionItem[] = [
  {
    collectionId: 1,
    name: 'コレクション',
    description: '表示確認用Collectionです',
    imageKey: 'collection_1',
    rarity: 'SR',
    getDate: null,
    acquired: false,
  },
  {
    collectionId: 2,
    name: 'コレクション',
    description: '表示確認用Collectionです',
    imageKey: 'collection_2',
    rarity: 'R',
    getDate: null,
    acquired: false,
  },
  {
    collectionId: 3,
    name: 'コレクション',
    description: '表示確認用Collectionです',
    imageKey: 'collection_3',
    rarity: 'C',
    getDate: null,
    acquired: false,
  },
];

const getImageSrc = (collection: CollectionItem) => {
  const imageKey = collection.imageKey ?? collection.imagekey;

  return collection.acquired && imageKey
    ? `/images/rewards/${imageKey}.png`
    : '/images/rewards/collection_locked.png';
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const collectionApi = {
  getCollections: async (): Promise<CollectionListResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/achievements`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Collection一覧の取得に失敗しました');
    }

    return response.json();
  },
};

const normalizeCompletedTaskCount = (value?: number): number => {
  if (typeof value !== 'number') {
    return 0;
  }

  return Math.max(0, value);
};

const normalizeProgressRate = (value?: number): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  if (value < 0) return 0;
  if (value > 100) return 100;

  return value;
};

/**
 * API から progressRate が返らない場合用。
 */
const calculateDisplayProgressRateFromCompletedTaskCount = (completedTaskCount: number): number => {
  const normalizedCount = Math.max(0, completedTaskCount);
  const remainder = normalizedCount % 10;

  if (normalizedCount >= 10 && remainder === 0) {
    return 100;
  }

  return remainder * 10;
};

const CollectionListPage: React.FC<CollectionListPageProps> = ({ onClose }) => {
  const navigate = useNavigate();

  const [completedTaskCount, setCompletedTaskCount] = useState(0);
  const [progressRate, setProgressRate] = useState<number | null>(null);
  const [availableGachaCount, setAvailableGachaCount] = useState(0);
  const [serverCanGacha, setServerCanGacha] = useState<boolean | null>(null);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const [isDrawing, setIsDrawing] = useState(false);
  const [jarFillPercent, setJarFillPercent] = useState(0);
  const [barFillPercent, setBarFillPercent] = useState(0);
  const [hasTransferredHoney, setHasTransferredHoney] = useState(false);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setIsLoading(true);

        const data = await collectionApi.getCollections();

        const fetchedCompletedTaskCount = normalizeCompletedTaskCount(data.completedTaskCount);
        setCompletedTaskCount(fetchedCompletedTaskCount);
        setProgressRate(normalizeProgressRate(data.progressRate));
        setAvailableGachaCount(Math.max(0, data.availableGachaCount ?? 0));
        setServerCanGacha(typeof data.canGacha === 'boolean' ? data.canGacha : null);
        setCollections(data.collections ?? MOCK_COLLECTIONS);
      } catch (error) {
        console.warn('Collection情報の取得に失敗したため、表示確認用データを使用します。', error);
        setCompletedTaskCount(0);
        setProgressRate(0);
        setAvailableGachaCount(0);
        setServerCanGacha(null);
        setCollections(MOCK_COLLECTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []);

  const displayProgressRate = useMemo(() => {
    if (typeof progressRate === 'number') {
      return progressRate;
    }

    return calculateDisplayProgressRateFromCompletedTaskCount(completedTaskCount);
  }, [progressRate, completedTaskCount]);

  const isProgressComplete = displayProgressRate >= 100;
  const hasPendingGacha = availableGachaCount > 0;
  const shouldPourHoney = isProgressComplete && hasPendingGacha;
  const readyToDraw = hasPendingGacha;

  const canGacha = useMemo(() => {
    const apiCanGacha
      = typeof serverCanGacha === 'boolean'
        ? serverCanGacha
        : availableGachaCount > 0;

    return apiCanGacha && !isDrawing;
  }, [serverCanGacha, availableGachaCount, isDrawing]);

  const currentIndex = useMemo(() => {
    if (!selectedCollection) return -1;
    return collections.findIndex(
      c => c.collectionId === selectedCollection.collectionId,
    );
  }, [selectedCollection, collections]);

  /**
   * 蜂蜜ゲージの表示制御。
   * 100% 到達時は進捗バーを瓶に移し、未使用の抽選回数がある間は瓶を満たしたままにする。
   */
  useEffect(() => {
    if (isDrawing) {
      setJarFillPercent(0);
      setBarFillPercent(0);
      setHasTransferredHoney(false);
      return;
    }

    if (shouldPourHoney) {
      setHasTransferredHoney(false);
      setJarFillPercent(0);
      setBarFillPercent(100);

      const transferTimer = setTimeout(() => {
        setBarFillPercent(0);
        setJarFillPercent(100);
        setHasTransferredHoney(true);
      }, 750);

      return () => {
        clearTimeout(transferTimer);
      };
    }

    setHasTransferredHoney(hasPendingGacha);
    setJarFillPercent(hasPendingGacha ? 100 : 0);
    setBarFillPercent(displayProgressRate);
  }, [displayProgressRate, hasPendingGacha, shouldPourHoney, isDrawing]);

  /**
   * 熊画像の切り替え。
   * 現在はユーザー希望に合わせて：
   * 未満100%: bearReady
   * 100%到達後: bearNormal
   */
  const currentBearSrc = readyToDraw ? forestAssets.bearNormal : forestAssets.bearReady;

  const handleClosePage = () => {
    if (onClose) {
      onClose();
      return;
    }

    navigate(-1);
  };

  const handleGachaClick = () => {
    if (!canGacha || isDrawing) return;

    setIsDrawing(true);
    setJarFillPercent(0);
    setBarFillPercent(0);
    setHasTransferredHoney(false);

    setTimeout(() => {
      navigate('/gacha');
    }, 900);
  };

  const handleCollectionClick = (collection: CollectionItem) => {
    setSelectedCollection(collection);
  };

  const handlePrevCollection = () => {
    changeCollectionWithSlide(currentIndex - 1, 'prev');
  };

  const handleNextCollection = () => {
    changeCollectionWithSlide(currentIndex + 1, 'next');
  };

  const SLIDE_DURATION = 250;

  const changeCollectionWithSlide = (newIndex: number, dir: 'next' | 'prev') => {
    if (newIndex < 0 || newIndex >= collections.length) return;

    setDirection(dir);
    setIsAnimating(true);

    setTimeout(() => {
      setSelectedCollection(collections[newIndex]);
      setIsAnimating(false);
    }, SLIDE_DURATION);
  };

  const handleCloseCollectionModal = () => {
    setSelectedCollection(null);
  };

  const isCollectionAcquired = (collection: CollectionItem): boolean => {
    return collection.acquired;
  };

  // コレクションによって文字の色を変える
  const getRarityTextColor = (rarity: string): string => {
    switch (rarity) {
      case 'SR':
        return '#d4af37'; // 金色
      case 'R':
        return '#8e24aa'; // 紫
      case 'C':
        return '#1565c0'; // 青
      default:
        return '#777';
    }
  };

  const acquiredCount = collections.filter(collection => collection.acquired).length;

  return (
    <div className="achievement-page">
      <style>
        {`

          /* ---------------------------
             ゴールド進行バーアニメーション
          ----------------------------- */
          @keyframes collectionGoldShine {
            0% {
              background-position: -220px 0;
              box-shadow:
                0 0 8px rgba(255, 215, 0, 0.55),
                inset 0 0 8px rgba(255, 255, 255, 0.55);
            }

            50% {
              box-shadow:
                0 0 22px rgba(255, 215, 0, 0.95),
                0 0 36px rgba(255, 180, 0, 0.65),
                inset 0 0 16px rgba(255, 255, 255, 0.95);
            }

            100% {
              background-position: 220px 0;
              box-shadow:
                0 0 8px rgba(255, 215, 0, 0.55),
                inset 0 0 8px rgba(255, 255, 255, 0.55);
            }
          }

          @keyframes collectionGoldSparkle {
            0%,
            100% {
              opacity: 0.25;
              transform: scale(0.95);
            }

            50% {
              opacity: 1;
              transform: scale(1.08);
            }
          }

          /* ------------------------
             スライドアニメーション
          ------------------------- */
          @keyframes slideOutToLeft {
            from {
              opacity: 1;
              transform: translateX(0) scale(1);
            }

            to {
              opacity: 0;
              transform: translateX(-40px) scale(0.95);
            }
          }

          @keyframes slideInFromRight {
            from {
              opacity: 0;
              transform: translateX(40px) scale(1.05);
            }

            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }

          @keyframes slideOutToRight {
            from {
              opacity: 1;
              transform: translateX(0) scale(1);
            }

            to {
              opacity: 0;
              transform: translateX(40px) scale(0.95);
            }
          }

          @keyframes slideInFromLeft {
            from {
              opacity: 0;
              transform: translateX(-40px) scale(1.05);
            }

            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }

          .collection-modal {
            font-family:
              "HGP創英角ポップ体",
              "Hiragino Maru Gothic ProN",
              "Rounded Mplus 1c",
              "Yu Gothic";
          }

          /*
            ページ全体。
            ページ自体はスクロールさせず、コレクション領域だけをスクロールさせる。
          */
          .achievement-page {
            height: calc(100vh - 64px);
            width: 100%;
            box-sizing: border-box;
            background:
              radial-gradient(circle at 10% 20%, rgba(232, 172, 61, 0.08), transparent 24%),
              radial-gradient(circle at 90% 85%, rgba(129, 157, 115, 0.10), transparent 26%),
              linear-gradient(180deg, #f7f3e7 0%, #f1eddc 100%);
            display: flex;
            justify-content: center;
            align-items: stretch;
            overflow: hidden;
            position: relative;
          }

          @keyframes bearReadyFloat {
            0%, 100% {
              transform: translateY(0) scale(1);
            }
            50% {
              transform: translateY(-5px) scale(1.03);
            }
          }

          @keyframes pourBarTilt {
            0% {
              transform: rotate(0deg) translateX(0) translateY(0);
            }
            45% {
              transform: rotate(-6deg) translateX(-9px) translateY(4px);
            }
            100% {
              transform: rotate(-6deg) translateX(-9px) translateY(4px);
            }
          }

          @keyframes progressGlow {
            0%, 100% {
              filter: drop-shadow(0 0 0 rgba(230, 174, 52, 0));
            }
            50% {
              filter: drop-shadow(0 0 9px rgba(230, 174, 52, 0.38));
            }
          }

          /*
            ページ内容本体。
            外側は大きめの角丸にして、絵本のページのような雰囲気にする。
          */
          .forest-modal {
            width: min(1120px, calc(100vw - 80px));
            height: calc(100% - 28px);
            margin: 14px auto;
            box-sizing: border-box;
            position: relative;
            padding: 22px 28px 24px;
            background:
              radial-gradient(circle at 18% 12%, rgba(255, 236, 176, 0.22), transparent 26%),
              linear-gradient(180deg, rgba(250, 247, 235, 0.96), rgba(246, 242, 225, 0.94));
            border: 1.5px solid rgba(180, 162, 110, 0.34);
            border-radius: 34px;
            box-shadow:
              0 14px 34px rgba(74, 91, 63, 0.10),
              inset 0 1px 0 rgba(255, 255, 255, 0.72),
              inset 0 0 0 1px rgba(255, 255, 255, 0.36);
            overflow: hidden;
            flex-shrink: 0;
          }

          .forest-modal::before {
            content: "";
            position: absolute;
            inset: 0;
            background: transparent;
            pointer-events: none;
            z-index: 0;
          }

          /*
            左右下の森装飾。
            コレクション一覧とは別レイヤーに置き、内容の邪魔にならないようにする。
          */
          .forest-decoration {
            position: absolute;
            z-index: 1;
            pointer-events: none;
            user-select: none;
          }

          .forest-decoration.left {
            left: -22px;
            bottom: -38px;
            width: 320px;
            opacity: 0.82;
          }

          .forest-decoration.right {
            right: -18px;
            bottom: -36px;
            width: 300px;
            opacity: 0.82;
          }

          .achievement-corner-decoration {
            position: absolute;
            z-index: 2;
            pointer-events: none;
            user-select: none;
            opacity: 0.72;
          }

          .achievement-corner-decoration.top-left {
            top: 8px;
            left: 8px;
            width: 240px;
          }

          .achievement-corner-decoration.top-right {
            top: 8px;
            right: 8px;
            width: 220px;
          }

          .achievement-title-row {
            position: relative;
            z-index: 3;
            display: flex;
            align-items: center;
            gap: 8px;
            height: 42px;
          }

          .achievement-title-row h2 {
            margin: 0;
            color: #4e6948;
            font-size: 32px;
            font-weight: 800;
            line-height: 38px;
            letter-spacing: 0.03em;
          }

          .wood-close-button {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 30;

  width: 48px;
  height: 48px;

  border-radius: 50%;
  border: 2.5px solid rgba(116, 82, 45, 0.55);

  background:
    repeating-linear-gradient(
      100deg,
      rgba(96, 62, 32, 0.045) 0px,
      rgba(96, 62, 32, 0.045) 2px,
      transparent 2px,
      transparent 6px
    ),
    repeating-linear-gradient(
      100deg,
      rgba(255, 244, 218, 0.18) 0px,
      rgba(255, 244, 218, 0.18) 1px,
      transparent 1px,
      transparent 9px
    ),
    radial-gradient(
      circle at 32% 28%,
      rgba(248, 220, 171, 0.86) 0%,
      rgba(232, 195, 134, 0.78) 32%,
      rgba(207, 159, 92, 0.70) 62%,
      rgba(177, 126, 72, 0.66) 84%,
      rgba(143, 94, 53, 0.62) 100%
    );

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  padding: 0;

  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);

  box-shadow:
    inset 0 4px 7px rgba(255, 247, 228, 0.46),
    inset 0 -6px 10px rgba(92, 59, 31, 0.20),
    0 3px 0 rgba(91, 61, 34, 0.42),
    0 6px 12px rgba(83, 63, 39, 0.18);

  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    filter 0.12s ease;
}

.wood-close-button::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;

  background:
    radial-gradient(
      circle at 35% 28%,
      rgba(255, 253, 244, 0.72) 0%,
      rgba(250, 235, 205, 0.34) 44%,
      rgba(198, 145, 83, 0.12) 100%
    );

  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.55),
    inset 0 -2px 4px rgba(119, 78, 42, 0.10);

  pointer-events: none;
}

.wood-close-button::after {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  border: 1px solid rgba(255, 246, 224, 0.42);
  pointer-events: none;
}

.wood-close-button:hover {
  transform: scale(1.06);
  filter: brightness(1.04) saturate(1.03);

  box-shadow:
    inset 0 4px 7px rgba(255, 247, 228, 0.52),
    inset 0 -6px 10px rgba(92, 59, 31, 0.22),
    0 3px 0 rgba(91, 61, 34, 0.44),
    0 8px 15px rgba(83, 63, 39, 0.22);
}

.wood-close-button:active {
  transform: translateY(3px) scale(0.96);

  box-shadow:
    inset 0 3px 7px rgba(255, 247, 228, 0.38),
    inset 0 -4px 8px rgba(92, 59, 31, 0.18),
    0 1px 0 rgba(91, 61, 34, 0.42),
    0 3px 8px rgba(83, 63, 39, 0.16);
}

.wood-close-button-inner {
  position: relative;
  z-index: 2;

  font-size: 20px;
  font-weight: 900;
  line-height: 1;

  color: rgba(73, 88, 58, 0.92);

  text-shadow:
    0 1px 0 rgba(255, 246, 220, 0.72),
    0 -1px 0 rgba(84, 54, 28, 0.12);

  transform: translateY(-1px);
  pointer-events: none;
}
          /*
            上部：蜂蜜瓶・進捗バー・熊。
            蜂蜜瓶と熊を同じ高さに見えるように中央揃えにする。
          */
          .forest-progress-row {
            position: relative;
            z-index: 3;
            margin-top: 4px;
            display: grid;
            grid-template-columns: 200px 450px 260px;
            align-items: center;
            justify-content: center;
            gap: 22px;
            height: 198px;
          }

          .jar-area {
            position: relative;
            width: 188px;
            height: 190px;
            overflow: visible;
            transform: translate(-24px, 8px);
            filter: drop-shadow(0 8px 10px rgba(85, 96, 63, 0.14));
          }

          .jar-fill-area {
            position: absolute;
            left: 56px;
            top: 70px;
            width: 79px;
            height: 67px;
            overflow: hidden;
            border-radius: 16px 16px 20px 20px;
            z-index: 3;
            pointer-events: none;
          }

          .jar-fill-liquid {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 0%;
            background: linear-gradient(
              180deg,
              rgba(255, 226, 126, 0.78) 0%,
              rgba(232, 172, 61, 0.86) 62%,
              rgba(202, 137, 39, 0.9) 100%
            );
            border-radius: 45% 45% 10px 10px;
            transition: height 1.05s ease;
            mix-blend-mode: multiply;
          }

          .jar-fill-liquid::before {
            content: "";
            position: absolute;
            left: 7px;
            right: 7px;
            top: 5px;
            height: 6px;
            border-radius: 999px;
            background: rgba(255,255,255,0.32);
          }

          .jar-image {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 186px;
            height: auto;
            object-fit: contain;
            z-index: 2;
            pointer-events: none;
          }

          .progress-column {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 0;
            width: 460px;
            overflow: visible;
          }

          .progress-percent-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            margin-bottom: -4px;
            position: relative;
            z-index: 10;
          }

          .progress-percent {
            color: #3f6247;
            font-size: 34px;
            font-weight: 800;
            letter-spacing: 0.08em;
            line-height: 1;
            text-shadow:
              0 2px 0 rgba(255, 255, 255, 0.62),
              0 4px 8px rgba(77, 96, 63, 0.10);
          }
          .progress-percent-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-bottom: -2px;
  position: relative;
  z-index: 10;
}

.progress-percent {
  color: #3f6247;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
  text-shadow:
    0 2px 0 rgba(255, 255, 255, 0.62),
    0 4px 8px rgba(77, 96, 63, 0.10);
}

.progress-percent-decoration {
  width: 86px;
  height: 12px;
  position: relative;
  display: inline-block;
  opacity: 0.78;
}

.progress-percent-decoration::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1.5px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(207, 174, 94, 0.34) 24%,
    rgba(207, 174, 94, 0.58) 50%,
    rgba(207, 174, 94, 0.34) 76%,
    transparent 100%
  );
  transform: translateY(-50%);
}

.progress-percent-decoration::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(255, 247, 214, 0.95) 0%, rgba(217, 181, 93, 0.72) 62%, transparent 68%);
  box-shadow:
    -18px 0 0 -2px rgba(207, 174, 94, 0.38),
    18px 0 0 -2px rgba(207, 174, 94, 0.38);
  transform: translateY(-50%);
}

.progress-percent-decoration.left::after {
  right: 6px;
}

.progress-percent-decoration.right::after {
  left: 6px;
}

          .progress-pour-layer {
            position: relative;
            width: 460px;
            height: 104px;
            transform-origin: 4% 58%;
            overflow: visible;
            filter: drop-shadow(0 8px 9px rgba(78, 89, 58, 0.13));
          }

          .progress-pour-layer.pouring {
            animation: pourBarTilt 0.75s ease-in-out forwards;
          }

          .progress-pour-layer.transferred {
            transform: rotate(-6deg) translateX(-9px) translateY(4px);
          }

          .progress-image-track {
            position: relative;
            width: 460px;
            height: 104px;
            overflow: visible;
          }

          .progress-image-track.complete {
            animation: progressGlow 1.4s ease-in-out infinite;
          }

          .progress-image-base,
          .progress-image-fill {
            position: absolute;
            left: 0;
            top: 50%;
            width: 460px;
            height: auto;
            transform: translateY(-50%);
            object-fit: contain;
            pointer-events: none;
          }

          .progress-image-base {
            filter: grayscale(0.58) brightness(0.88);
            opacity: 0.34;
          }

          .progress-image-fill-wrap {
            position: absolute;
            left: 0;
            top: 0;
            width: 0%;
            height: 100%;
            overflow: hidden;
            transition: width 0.75s ease;
            z-index: 2;
          }

          .progress-image-fill {
            max-width: none;
          }

          .bear-column {
            display: flex;
            justify-content: center;
            align-items: center;
            padding-top: 4px;
            width: 260px;
            overflow: visible;
          }

          .bear-gacha-button {
            position: relative;
            width: 260px;
            height: 190px;
            min-height: 190px;
            border: none;
            background: transparent;
            padding: 0;
            cursor: default;
            transition: transform 0.25s ease;
            overflow: visible;
            filter: drop-shadow(0 8px 10px rgba(73, 88, 58, 0.16));
          }

          .bear-gacha-button.ready {
            cursor: pointer;
            animation: bearReadyFloat 1.1s ease-in-out infinite;
          }

          .bear-gacha-button:disabled {
            cursor: not-allowed;
          }

          .bear-image {
            position: absolute;
            top: -4px;
            left: 50%;
            width: 258px;
            height: 176px;
            object-fit: contain;
            display: block;
            transform: translateX(-50%);
            pointer-events: none;
            z-index: 2;
          }

          .bear-gacha-text {
            position: absolute;
            left: 50%;
            bottom: 10px;
            width: 194px;
            height: 64px;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #f8f4e7;
            font-size: 18px;
            font-weight: 800;
            text-align: center;
            letter-spacing: 0.04em;
            text-shadow: 0 2px 3px rgba(35, 55, 35, 0.28);
            z-index: 4;
          }

          .bear-gacha-board-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            user-select: none;
            filter: drop-shadow(0 4px 5px rgba(54, 71, 45, 0.18));
          }

          .bear-gacha-label {
            position: relative;
            z-index: 5;
            padding-bottom: 2px;
          }

          /*
            コレクション展示エリア。
            ここだけスクロールさせる。
          */
          .collection-area {
  position: relative;
  z-index: 4;
  width: min(920px, 100%);
  height: calc(100% - 230px);
  min-height: 300px;
  margin: 4px auto 0;
  box-sizing: border-box;
  padding: 12px 16px 18px;
  border-radius: 32px;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.34), transparent 34%),
    radial-gradient(circle at 82% 86%, rgba(190, 210, 158, 0.12), transparent 38%),
    rgba(248, 244, 231, 0.74);
  border: 2px solid rgba(129, 157, 115, 0.24);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.58),
    inset 0 0 0 1px rgba(255, 255, 255, 0.28),
    0 12px 26px rgba(79, 105, 72, 0.08);
  backdrop-filter: blur(2px);
  overflow: hidden;
}

/* 中身を装飾より上に出す */
.collection-area > * {
  position: relative;
  z-index: 2;
}

.collection-area-header {
  position: relative;
  z-index: 2;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  color: #4e6948;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-sizing: border-box;
}

.collection-area-header::after {
  content: '';
  position: absolute;
  left: 18px;
  bottom: -4px;
  width: 150px;
  height: 1.5px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(83, 111, 75, 0.34),
    rgba(202, 174, 103, 0.42),
    transparent
  );
}

.collection-count {
  color: #6f7868;
  font-size: 17px;
  font-weight: 700;
}

/* 底部中央：細い金線と肉球の飾り */
.collection-bottom-ornament {
  position: absolute;
  left: 50%;
  bottom: 13px;
  transform: translateX(-50%);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
  opacity: 0.86;
}

.collection-ornament-line {
  display: block;
  width: 122px;
  height: 1.5px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(199, 164, 84, 0.24) 12%,
    rgba(199, 164, 84, 0.68) 50%,
    rgba(199, 164, 84, 0.24) 88%,
    transparent 100%
  );
}

.collection-ornament-paw {
  position: relative;
  top: -1px;
  color: rgba(199, 164, 84, 0.86);
  font-size: 20px;
  line-height: 1;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.55),
    0 0 8px rgba(205, 184, 120, 0.22);
}

/*
  実際にスクロールする部分。
  コレクションが20個以上あっても、この中だけを上下に動かす。
*/
.collection-grid-wrapper {
  position: relative;
  z-index: 2;
  height: calc(100% - 42px);
  overflow-y: scroll;
  overflow-x: hidden;
  padding: 20px 28px 72px;
  box-sizing: border-box;
  border-radius: 24px;
  background: transparent;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(129, 157, 115, 0.46) rgba(248, 244, 231, 0.58);

  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.16) 0%,
      rgba(255, 255, 255, 0.04) 46%,
      rgba(196, 213, 166, 0.08) 100%
    );
}

.collection-grid-wrapper::-webkit-scrollbar {
  width: 10px;
}

.collection-grid-wrapper::-webkit-scrollbar-track {
  background: rgba(248, 244, 231, 0.36);
  border-radius: 999px;
  border: 1px solid rgba(129, 157, 115, 0.10);
}

.collection-grid-wrapper::-webkit-scrollbar-thumb {
  background: rgba(129, 157, 115, 0.24);
  border-radius: 999px;
  border: 2px solid rgba(248, 244, 231, 0.72);
}

.collection-grid-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(129, 157, 115, 0.34);
}

.collection-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(4, 150px);
  justify-content: center;
  column-gap: 56px;
  row-gap: 44px;
  padding-bottom: 28px;
}
          .collection-button {
            width: 150px;
            padding: 0;
            margin: 0;
            border: none;
            background: transparent;
            cursor: pointer;
            text-align: center;
            user-select: none;
            -webkit-user-select: none;
          }

          .collection-frame-wrap {
            position: relative;
            width: 150px;
            height: 116px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .collection-frame-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
            user-select: none;
          }

          .collection-frame-wrap.locked .collection-frame-img {
            filter: grayscale(1) brightness(0.83);
            opacity: 0.78;
          }

          .collection-frame-wrap.acquired .collection-frame-img {
            filter: brightness(1.08) saturate(1.10) drop-shadow(0 4px 10px rgba(111, 143, 93, 0.18));
            opacity: 1;
          }

          .collection-reward-image {
            position: relative;
            z-index: 2;
            width: 68px;
            height: 68px;
            object-fit: contain;
            user-select: none;
            -webkit-user-drag: none;
          }

          .collection-placeholder {
            position: relative;
            z-index: 2;
            color: #8b9384;
            font-size: 36px;
            font-weight: 800;
            line-height: 1;
          }

          .collection-rarity {
            margin-top: 0;
            color: #4d6a45;
            font-size: 17px;
            font-weight: 800;
            line-height: 18px;
            user-select: none;
          }

          /*
            画面幅が狭い場合の簡易対応。
          */
          @media (max-width: 980px) {
            .forest-modal {
               width: min(1240px, calc(100vw - 32px));
               height: min(720px, calc(100vh - 32px));
            }

            .forest-progress-row {
              grid-template-columns: 130px minmax(340px, 1fr) 150px;
              gap: 12px;
            }

            .progress-column,
            .progress-pour-layer,
            .progress-image-track,
            .progress-image-base,
            .progress-image-fill {
              width: 420px;
            }

            .collection-grid {
              grid-template-columns: repeat(3, 150px);
              column-gap: 32px;
            }
          }
        `}
      </style>

      <div className="forest-modal">
        {/* 左下・右下の森装飾 */}
        <img src={forestAssets.forestLeft} alt="" className="forest-decoration left" />
        <img src={forestAssets.forestRight} alt="" className="forest-decoration right" />
        <img
          src={forestAssets.cornerTopLeft}
          alt=""
          className="achievement-corner-decoration top-left"
        />

        <img
          src={forestAssets.cornerTopRight}
          alt=""
          className="achievement-corner-decoration top-right"
        />
        {/* 戻るボタン */}
        <button
          type="button"
          onClick={handleClosePage}
          className="wood-close-button"
          aria-label="close"
        >
          <span className="wood-close-button-inner">×</span>
        </button>

        {/* 画面タイトル */}
        <div className="achievement-title-row">
          <h2>実績</h2>
        </div>

        {/* 蜂蜜瓶・進捗バー・熊ガチャボタン */}
        <div className="forest-progress-row">
          <div className="jar-area">
            <div className="jar-fill-area">
              <div
                className="jar-fill-liquid"
                style={{
                  height: `${jarFillPercent}%`,
                }}
              />
            </div>

            <img src={forestAssets.jar} alt="" className="jar-image" />
          </div>

          <div className="progress-column">
            <div className="progress-percent-row">
              <span className="progress-percent-decoration left" />
              <div className="progress-percent">
                {isDrawing ? 0 : displayProgressRate}
                %
              </div>
              <span className="progress-percent-decoration right" />
            </div>

            <div
              className={[
                'progress-pour-layer',
                shouldPourHoney && !isDrawing ? 'pouring' : '',
                hasTransferredHoney ? 'transferred' : '',
              ].join(' ')}
            >
              <div className={`progress-image-track ${shouldPourHoney ? 'complete' : ''}`}>
                <img src={forestAssets.progress} alt="" className="progress-image-base" />

                <div
                  className="progress-image-fill-wrap"
                  style={{
                    width: `${isDrawing ? 0 : barFillPercent}%`,
                  }}
                >
                  <img src={forestAssets.progress} alt="" className="progress-image-fill" />
                </div>
              </div>
            </div>
          </div>

          <div className="bear-column">
            <button
              type="button"
              onClick={handleGachaClick}
              disabled={!canGacha}
              className={`bear-gacha-button ${readyToDraw && !isDrawing ? 'ready' : ''}`}
            >
              <img src={currentBearSrc} alt="bear gacha" className="bear-image" />
              <div className="bear-gacha-text">
                <img src={forestAssets.gachaBoard} alt="" className="bear-gacha-board-img" />
                <span className="bear-gacha-label">
                  ガチャ ×
                  {' '}
                  {availableGachaCount}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* コレクション一覧 */}
        <div className="collection-area">
          <div className="collection-area-header">
            <span>コレクション</span>
            <span className="collection-count">
              {acquiredCount}
              /
              {collections.length}
            </span>
          </div>

          <div className="collection-grid-wrapper">
            <div className="collection-grid">
              {!isLoading
                && collections.map((collection) => {
                  const acquired = isCollectionAcquired(collection);

                  return (
                    <button
                      key={collection.collectionId}
                      type="button"
                      onClick={() => handleCollectionClick(collection)}
                      className="collection-button"
                    >
                      <div className={`collection-frame-wrap ${acquired ? 'acquired' : 'locked'}`}>
                        <img src={forestAssets.frame} alt="" className="collection-frame-img" />

                        {acquired
                          ? (
                            <img
                              src={getImageSrc(collection)}
                              alt={collection.name}
                              className="collection-reward-image"
                            />
                          )
                          : (
                            <div className="collection-placeholder">?</div>
                          )}
                      </div>

                      <div className="collection-rarity">
                        {collection.rarity}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="collection-bottom-ornament" aria-hidden="true">
            <span className="collection-ornament-line" />
            <span className="collection-ornament-paw">🐾</span>
            <span className="collection-ornament-line" />
          </div>
        </div>

        {/* コレクション詳細モーダル */}
        {selectedCollection && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              transform: 'scale(2)',
              transformOrigin: 'center center',
              zIndex: 1050,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onClick={handleCloseCollectionModal}
          >

            <div
              style={{
                width: '320px',
                background: '#f7f3e7',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                position: 'relative',

                animation: isAnimating
                  ? direction === 'next'
                    ? 'slideOutToLeft 0.25s ease forwards'
                    : 'slideOutToRight 0.25s ease forwards'
                  : direction === 'next'
                    ? 'slideInFromRight 0.25s ease forwards'
                    : 'slideInFromLeft 0.25s ease forwards',
              }}
            >

              {/* 閉じる */}
              <button
                onClick={handleCloseCollectionModal}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>

              {/* ステータス */}
              <div
                style={{
                  marginBottom: '12px',
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                  backgroundColor: selectedCollection.acquired ? '#4caf50' : '#9e9e9e',
                }}
              >
                {selectedCollection.acquired ? '取得済み' : '未取得'}
              </div>

              {/* 画像エリア */}
              <div
                style={{
                  position: 'relative',
                  width: '140px',
                  height: '140px',
                  margin: '0 auto 16px',
                  borderRadius: '12px',
                  backgroundColor: selectedCollection.acquired ? '#fff7dc' : '#f4f4f4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >

                {/* 画像 */}
                <img
                  src={getImageSrc(selectedCollection)}
                  alt={selectedCollection.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              <div
                style={{
                  position: 'relative',
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    position: 'relative',
                    color: '#4e6948',
                  }}
                >
                  {/* No（名前の左に配置） */}
                  <span
                    style={{
                      position: 'absolute',
                      right: '100%',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      marginRight: '6px',
                      fontSize: '12px',
                      color: '#999',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    No.
                    {selectedCollection.collectionId}
                  </span>

                  {/* 名前（中央） */}
                  {selectedCollection.acquired ? selectedCollection.name : '？？？'}
                </span>
              </div>

              {/* レア度 */}

              <div
                style={{
                  marginTop: '6px',
                  fontWeight: 'bold',
                  color: selectedCollection.acquired
                    ? getRarityTextColor(selectedCollection.rarity)
                    : '#ccc',
                }}
              >
                {selectedCollection.acquired ? selectedCollection.rarity : '　　　'}
              </div>

              {/* 取得状態メッセージ */}
              {!selectedCollection.acquired && (
                <div style={{ marginTop: '12px', color: '#777' }}>
                  ここにはまだ誰もいません
                </div>
              )}

              {/* 取得済み情報 */}
              {selectedCollection.acquired && (
                <>
                  <div style={{ marginTop: '10px', fontSize: '13px', color: '#777' }}>
                    取得日時:
                    {selectedCollection.getDate
                      ? new Date(selectedCollection.getDate).toLocaleString()
                      : '-'}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    {selectedCollection.description}
                  </div>
                </>
              )}
            </div>
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                handlePrevCollection();
              }}
              disabled={currentIndex === 0}
              style={{
                position: 'absolute',
                top: '50%',
                left: 'calc(50% - 220px)',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ffffffdd',
                border: '1px solid #ddd',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentIndex === 0 ? 0.3 : 1,
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleNextCollection();
              }}
              disabled={currentIndex === collections.length - 1}
              style={{
                position: 'absolute',
                top: '50%',
                right: 'calc(50% - 220px)',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#ffffffdd',
                border: '1px solid #ddd',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor:
                  currentIndex === collections.length - 1
                    ? 'not-allowed'
                    : 'pointer',
                opacity: currentIndex === collections.length - 1 ? 0.3 : 1,
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            ``

          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionListPage;
