import React from "react";
import { mapAssetUrl } from "../services/mapService";

export default function DirectionSteps({ steps, onSelectFloor }) {
  if (!steps.length) return null;
  return (
    <section className="direction-steps" aria-labelledby="directions-heading">
      <h3 id="directions-heading">เดินตามขั้นตอนนี้</h3>
      <p>เมื่อถึงบันไดหรือลิฟต์ กดดูชั้นถัดไป แผนผังไม่ได้ติดตามตำแหน่งของคุณอัตโนมัติ</p>
      <ol>
        {steps.map((step, index) => (
          <li key={index} className={`direction-step direction-step--${step.kind}`}>
            <p>{step.text}</p>
            {step.target_floor_id != null && (
              <button type="button" onClick={() => onSelectFloor(step.target_floor_id)}>ดูชั้นที่ไปถึง</button>
            )}
            {step.landmark_description && <details>
              <summary>ดูจุดสังเกต</summary>
              <p>{step.landmark_description}</p>
              {step.image_url && <img src={mapAssetUrl(step.image_url)} alt={step.landmark_description} loading="lazy" />}
            </details>}
          </li>
        ))}
      </ol>
    </section>
  );
}
