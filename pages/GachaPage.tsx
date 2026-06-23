import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './GachaPage.css';
import { collectionApi, CollectionShelfItemDto } from '../services/api';

type GachaStep = 'ready' | 'mixing' | 'dropped' | 'moving' | 'opening' | 'result';

type CapsuleRarity = 'blue' | 'purple' | 'gold';

type Reward = {
  id: string
  name: string
  description: string
  rarity: CapsuleRarity
  imageUrl: string
};
type CatState = 'sitting' | 'happy' | 'warning_no_draws' | 'warning_all_collected' | null;
type DecorItem = {
  src: string
  top?: string
  left?: string
  right?: string
  bottom?: string
  width?: string
  rotate?: string
};
const gachaBoardDecorations: DecorItem[] = [
  { src: '/images/flower.png', bottom: '28px', right: '115px', width: '50px' },
  { src: '/images/cathouse.png', bottom: '60px', left: '43px', width: '200px' },
  { src: '/images/present.png', bottom: '10px', left: '195px', width: '110px' },
  { src: '/images/flower2.png', bottom: '8px', right: '30px', width: '100px' },
  { src: '/images/catbed.png', bottom: '-10px', left: '-30px', width: '200px' },
  { src: '/images/butterfly1.png', bottom: '95px', right: '100px', width: '60px' },
  { src: '/images/butterfly2.png', top: '100px', left: '100px', width: '90px' },
  { src: '/images/catboard.png', top: '194px', right: '145px', width: '70px' },
  { src: '/images/kuma.png', bottom: '0px', right: '100px', width: '200px' },
  { src: '/images/flower4.png', bottom: '93px', right: '175px', width: '30px' },
];
const rewardBoardDecorations: DecorItem[] = [
  { src: '/images/flower.png', bottom: '28px', right: '115px', width: '50px' },
  { src: '/images/cathouse.png', bottom: '60px', left: '43px', width: '200px' },
  { src: '/images/flower2.png', bottom: '8px', right: '30px', width: '100px' },
  { src: '/images/butterfly1.png', bottom: '95px', right: '100px', width: '60px' },
  { src: '/images/butterfly2.png', top: '100px', left: '100px', width: '90px' },
  { src: '/images/catboard.png', top: '194px', right: '145px', width: '70px' },
  { src: '/images/vine2.png', bottom: '265px', right: '215px', width: '150px' },
  { src: '/images/vine3.png', top: '80px', left: '215px', width: '150px' },
  { src: '/images/butterfly3.png', bottom: '260px', right: '295px', width: '40px' },
  { src: '/images/boardvine1.png', bottom: '-30px', left: '-50px', width: '300px' },
  { src: '/images/boardvine2.png', bottom: '-40px', right: '-70px', width: '300px' },

];

// ─── レア度変換 ───────────────────────────────────────
const rarityMap: Record<CollectionShelfItemDto['rarity'], CapsuleRarity> = {
  C: 'blue',
  R: 'purple',
  SR: 'gold',
};

// ─── DTO → Reward 変換 ────────────────────────────────
const toReward = (dto: CollectionShelfItemDto): Reward => ({
  id: String(dto.id),
  name: dto.name,
  description: dto.description ?? '',
  rarity: rarityMap[dto.rarity],
  imageUrl: dto.imagekey ? `/images/rewards/${dto.imagekey}.png` : '',
});

// ─── API呼び出し ──────────────────────────────────────
const drawReward = async (): Promise<Reward> => {
  const dto = await collectionApi.draw();
  return toReward(dto);
};

const wait = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// ─── GachaPage ────────────────────────────────────────
export const GachaPage = ({ onBack }: { onBack?: () => void }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<GachaStep>('ready');
  const [reward, setReward] = useState<Reward | null>(null);
  const [error, setError] = useState<string | null>(null);
  // GachaPage内のstateに追加
  const [catState, setCatState] = useState<CatState>('sitting');
  // handleStartGachaを修正
  const handleStartGacha = async () => {
    if (step !== 'ready') return;

    setStep('mixing');
    setError(null);
    setCatState(null); // いったんリセット

    try {
      const selectedReward = await drawReward();

      setCatState('happy'); // 成功時
      await wait(4000);

      setReward(selectedReward);
      setStep('dropped');

      // droppedになったらsittingに戻す
      setCatState('sitting');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';

      if (message.includes('抽選回数がありません')) {
        setCatState('warning_no_draws');
      } else if (message.includes('すべてのコレクションを獲得済みです')) {
        setCatState('warning_all_collected');
      } else {
        setError('ガチャに失敗しました。もう一度お試しください。');
        setCatState('sitting');
      }
      setStep('ready');
    }
  };

  const handleCapsuleClick = async () => {
    if (step !== 'dropped') return;

    // ① 中央へ移動
    setStep('moving');
    await wait(1400);

    // ② 割れる演出
    setStep('opening');
    await wait(1600);

    // ③ 結果画面へ
    setStep('result');
  };

  const handleGetReward = () => {
    if (!reward) {
      return;
    }

    console.log('獲得した報酬:', reward);
    setReward(null);
    setStep('ready');
  };

  return (
    <div className="gacha-page">
      {step !== 'result' && (
        <section className="gacha-board">
          {/* ✖ 返回按钮 */}
          <button
            className="gacha-back-btn"
            onClick={() =>
              navigate('/collectionpagelist', {
                replace: true,
              })}
          />
          {/* 常に表示 */}
          <PixelCat
            catState={catState}
            step={step}
            onCloseWarning={() => setCatState('sitting')}
          />
          {gachaBoardDecorations.map((d, i) => (
            <img
              key={i}
              src={d.src}
              alt=""
              className="gacha-decor"
              style={{
                top: d.top,
                left: d.left,
                right: d.right,
                bottom: d.bottom,
                width: d.width,
                transform: d.rotate ? `rotate(${d.rotate})` : undefined,
              }}
            />
          ))}
          <div className="gacha-machine-area">

            {/* ✅ 看板：木枠＋金属プレート風 */}
            <div className="signboard">
              <div className="signboard-chain signboard-chain-left" />
              <div className="signboard-chain signboard-chain-right" />
              <div className="signboard-frame">
                <div className="signboard-screw signboard-screw-tl" />
                <div className="signboard-screw signboard-screw-tr" />
                <div className="signboard-screw signboard-screw-bl" />
                <div className="signboard-screw signboard-screw-br" />
                <p className="signboard-text">
                  {step === 'mixing' ? 'ガチャガチャ中' : 'らくらくカプセル'}
                </p>
              </div>
            </div>
            <div className={`machine-frame ${step === 'mixing' ? 'machine-shake' : ''}`}>
              <div className="capsule-tank-wrapper">
                <div className="paw-pad paw-1" />
                <div className="paw-pad paw-2" />
                <div className="paw-pad paw-3" />
                <div className="paw-pad paw-4" />
                <div className="capsule-tank">

                  <div className={`capsule-layer ${step === 'mixing' ? 'is-mixing' : ''}`}>
                    <span className="inner-capsule capsule-blue capsule-1" />
                    <span className="inner-capsule capsule-blue capsule-2" />
                    <span className="inner-capsule capsule-blue capsule-3" />
                    <span className="inner-capsule capsule-blue capsule-4" />
                    <span className="inner-capsule capsule-blue capsule-5" />
                    <span className="inner-capsule capsule-blue capsule-6" />
                    <span className="inner-capsule capsule-blue capsule-7" />
                    <span className="inner-capsule capsule-purple capsule-8" />
                    <span className="inner-capsule capsule-purple capsule-9" />
                    <span className="inner-capsule capsule-gold capsule-10" />
                  </div>
                </div>
              </div>
              <div className="machine-body">

                {/* metal-plate */}
                <div className="metal-plate">
                  <div className="screw screw-tl" />
                  <div className="screw screw-tr" />
                  <div className="screw screw-bl" />
                  <div className="screw screw-br" />

                  <p className="plate-line1">チームC&J</p>
                  <p className="plate-line2">ToDoListAPP</p>
                </div>

                {/* 投币口 */}
                <div className="dial">
                  <div className="dial-inner"></div>
                </div>

                <div className="machine-exit">

                  {/* door */}
                  <div className={`exit-door ${step !== 'dropped' ? 'closed' : 'open'}`} />

                  {/* カチャカチャ中のボール */}
                  {step === 'dropped' && reward && (
                    <button
                      className={`exit-capsule dropped-${reward.rarity}`}
                      onClick={handleCapsuleClick}
                      aria-label="カプセルを開ける"
                    />
                  )}

                </div>

              </div>
              <button
                type="button"
                className="gacha-start-btn"
                onClick={handleStartGacha}
                disabled={step !== 'ready'}
              >
                {step === 'mixing' ? '...' : 'START'}
              </button>

            </div>
          </div>
        </section>
      )}
      {/* ===== 開封アニメーション ===== */}
      {(step === 'moving' || step === 'opening') && reward && (
        <CapsuleOpenOverlay step={step} reward={reward} />
      )}
      {/* ===== 結果画面 ===== */}
      {step === 'result' && reward && (
        <RewardResult reward={reward} onGetReward={handleGetReward} />
      )}
    </div>
  );
};

/* ============================================================
   開封オーバーレイ
   ============================================================ */
type CapsuleOpenOverlayProps = {
  step: 'moving' | 'opening'
  reward: Reward
};

const CapsuleOpenOverlay = ({ step, reward }: CapsuleOpenOverlayProps) => {
  return (
    <div className={`capsule-overlay overlay-rarity-${reward.rarity}`}>

      {/* 放射光（opening時のみ） */}
      {step === 'opening' && (
        <div className={`burst-light burst-light-${reward.rarity}`} />
      )}

      {/* カプセル上半分 */}
      <div
        className={`overlay-cap-half overlay-cap-top overlay-cap-top-${reward.rarity} ${step === 'opening'
          ? 'split-top'
          : ''
        }`}
      />

      {/* カプセル下半分 */}
      <div
        className={`overlay-cap-half overlay-cap-bottom ${step === 'opening' ? 'split-bottom' : ''
        }`}
      />

      {/* 中身が飛び出す（opening時のみ） */}
      {step === 'opening' && (
        <div className="capsule-content-burst">
          <img
            className="burst-image"
            src={reward.imageUrl}
            alt={reward.name}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

/* ============================================================
   結果画面
   ============================================================ */
type RewardResultProps = {
  reward: Reward
  onGetReward: () => void
};

const RewardResult = ({ reward, onGetReward }: RewardResultProps) => {
  return (
    <section className={`reward-board reward-${reward.rarity}`}>
      {rewardBoardDecorations.map((d, i) => (
        <img
          key={i}
          src={d.src}
          alt=""
          className="gacha-decor"
          style={{
            top: d.top,
            left: d.left,
            right: d.right,
            bottom: d.bottom,
            width: d.width,
            transform: d.rotate ? `rotate(${d.rotate})` : undefined,
          }}
        />
      ))}
      <div className="reward-panel">
        <p className="reward-heading">{getRewardHeading(reward.rarity)}</p>

        <div className="reward-image-box">
          <img
            className="reward-image"
            src={reward.imageUrl}
            alt={reward.name}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />

        </div>

        {/* DBのdescriptionをsubtitleとして表示 */}
        <p className="reward-subtitle">
          {reward.description}
        </p>

        {/* DBのnameを表示 */}
        <h2 className="reward-name">{reward.name}</h2>

        <button
          type="button"
          className="reward-get-button"
          onClick={onGetReward}
        >
          GET
        </button>
      </div>
    </section>
  );
};

/* ============================================================
   ヘルパー
   ============================================================ */
const getRewardHeading = (
  rarity: CapsuleRarity,
): string => {
  switch (rarity) {
    case 'gold':
      return '大当たり！';

    case 'purple':
      return 'レア報酬をゲット！';

    case 'blue':
    default:
      return '報酬をゲット！';
  }
};
/* ============================================================
   ピクセル猫
   ============================================================ */
type PixelCatProps = {
  catState: CatState
  step: GachaStep
  onCloseWarning: () => void
};

const PixelCat = ({ catState, step, onCloseWarning }: PixelCatProps) => {
  const warningMessage
    = catState === 'warning_no_draws'
      ? '抽選回数もないニャー'
      : catState === 'warning_all_collected'
        ? 'すべてのコレクションももらったニャー'
        : null;
  const stepMessage
    = step === 'ready'
      ? '右のボタンを押してニャー'
      : step === 'dropped'
        ? '出てきたカプセルをクリックしてニャー'
        : null;
  const message = warningMessage ?? stepMessage;
  const isWarning = warningMessage !== null;
  return (
    <div className="pixel-cat-wrapper">
      {/* 吹き出し（warningまたはステップメッセージ） */}
      {message && (
        <div className="pixel-cat-balloon">
          <span className="balloon-paw paw-tl">🐾</span>
          <span className="balloon-paw paw-tr">🐾</span>
          <p className="balloon-text">{message}</p>
          {isWarning && (
            <button className="pixel-cat-close" onClick={onCloseWarning}>✕</button>
          )}
        </div>
      )}

      {/* 猫本体 */}
      <div className={`pixel-cat-sprite pixel-cat-${catState ?? 'sitting'}`} />
    </div>
  );
};
