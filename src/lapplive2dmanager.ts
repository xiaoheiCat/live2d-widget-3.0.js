/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { Live2DCubismFramework as cubismmatrix44 } from "./Framework/math/cubismmatrix44";
import { Live2DCubismFramework as csmvector } from "./Framework/type/csmvector";
import { Live2DCubismFramework as acubismmotion } from "./Framework/motion/acubismmotion";
import Csm_csmVector = csmvector.csmVector;
import Csm_CubismMatrix44 = cubismmatrix44.CubismMatrix44;
import ACubismMotion = acubismmotion.ACubismMotion;
import { config } from "./config/configMgr";

import { LAppModel } from "./lappmodel";
import { LAppPal } from "./lapppal";
import { canvas } from "./lappdelegate";
import * as LAppDefine from "./lappdefine";

export let s_instance: LAppLive2DManager = null;

/**
 * サンプルアプリケーションにおいてCubismModelを管理するクラス
 * モデル生成と破棄、タップイベントの処理、モデル切り替えを行う。
 */
export class LAppLive2DManager {
  /**
   * クラスのインスタンス（シングルトン）を返す。
   * インスタンスが生成されていない場合は内部でインスタンスを生成する。
   *
   * @return クラスのインスタンス
   */
  public static getInstance(): LAppLive2DManager {
    if (s_instance == null) {
      s_instance = new LAppLive2DManager();
    }

    return s_instance;
  }

  /**
   * クラスのインスタンス（シングルトン）を解放する。
   */
  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance = void 0;
    }

    s_instance = null;
  }


  /**
   * 現在のシーンで保持しているすべてのモデルを解放する
   */
  public releaseAllModel(): void {
    this._model.release()
  }

  /**
   * 画面をドラッグした時の処理
   *
   * @param x 画面のX座標
   * @param y 画面のY座標
   */
  public onDrag(x: number, y: number): void {
    if (this._model) {
      this._model.setDragging(x, y);
    }
  }

  /**
   * 画面をタップした時の処理
   *
   * @param x 画面のX座標
   * @param y 画面のY座標
   */
  public onTap(x: number, y: number): void {
    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(
        `[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`
      );
    }

    if (this._model.hitTest(LAppDefine.HitAreaNameHead, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameHead}]`);
      }
      this._model.setRandomExpression();
    } else if (this._model.hitTest(LAppDefine.HitAreaNameBody, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameBody}]`);
      }
      this._model.startRandomMotion(
        LAppDefine.MotionGroupTapBody,
        LAppDefine.PriorityNormal,
        this._finishedMotion
      );
    }
  }

  /**
   * 画面を更新するときの処理
   * モデルの更新処理及び描画処理を行う
   */
  public onUpdate(): void {
    let projection: Csm_CubismMatrix44 = new Csm_CubismMatrix44();

    const { width, height } = canvas;
    projection.scale(4.0, (4 * width) / height);

    if (this._viewMatrix != null) {
      projection.multiplyByMatrix(this._viewMatrix);
    }

    const saveProjection: Csm_CubismMatrix44 = projection.clone();

    const model: LAppModel = this._model;
    projection = saveProjection.clone();

    model.update();
    model.draw(projection); // 参照渡しなのでprojectionは変質する。
  }

  /**
   * コンストラクタ
   */
  constructor() {
    const modelSettingPath: string = config.model.jsonPath;
    const modelHomeDir = modelSettingPath.substring(
      0,
      modelSettingPath.lastIndexOf("/") + 1
    );
    const modelJsonName = modelSettingPath.substring(
      modelSettingPath.lastIndexOf("/") + 1
    );
    console.log(modelSettingPath)
    this._viewMatrix = new Csm_CubismMatrix44();
    this._model = new LAppModel();
    this._model.loadAssets(modelHomeDir, modelJsonName);
  }

  _viewMatrix: Csm_CubismMatrix44; // モデル描画に用いるview行列
  _model: LAppModel; // モデルインスタンスのコンテナ
  // モーション再生終了のコールバック関数
  _finishedMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage("Motion Finished:");
    console.log(self);
  };
}
