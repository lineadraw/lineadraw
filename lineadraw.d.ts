// GENERATED — do not edit. Typings for the virtual "lineadraw" and
// "lineadraw/helpers" modules block scripts import from, emitted from
// packages/core/src/blocks/{blockTypes,blockHelpers}.ts. Regenerate with:
//   npm run gen:lineadraw-dts -w @lineadraw/core

declare module "lineadraw" {
  /** A 2D point (mm, y-up). Point-valued fields also accept [x, y]. */
  export type Vec2 = {
      x: number;
      y: number;
  };
  export type Vec2Like = Vec2 | readonly [number, number];
  /** Polyline vertex; bulge = tan(sweep/4), 0 = straight. Accepts [x, y, bulge?]. */
  export type PolylineVertexLike = {
      x: number;
      y: number;
      bulge?: number;
  } | readonly [number, number, number?];
  /** Style overrides children may carry (otherwise inherited from the instance). */
  export type BaseStyle = {
      /** #rrggbb; absent = by layer. */
      color?: string;
      /** Line type; absent = by layer. */
      lineType?: string;
      /** Dash-pattern length multiplier; absent = 1. */
      lineTypeScale?: number;
      /** Line weight in mm; absent = by layer. */
      lineWidth?: number;
  };
  /**
   * T plus the shared style fields, FLATTENED (the homomorphic map forces the
   * intersection to resolve): hovers then list every member inline instead of
   * the opaque `BaseStyle & { … }` — the block editor has no expand-type
   * affordance, so the alias display is all a script author gets.
   */
  type Styled<T> = {
      [K in keyof (T & BaseStyle)]: (T & BaseStyle)[K];
  } & {};
  export type Line = Styled<{
      type: "line";
      a: Vec2Like;
      b: Vec2Like;
  }>;
  /** A point: paints as a round dot whose diameter is the lineWidth. */
  export type Point = Styled<{
      type: "point";
      p: Vec2Like;
  }>;
  export type Polyline = Styled<{
      type: "polyline";
      /** At least 2 vertices. */
      points: readonly PolylineVertexLike[];
      closed?: boolean;
  }>;
  export type Circle = Styled<{
      type: "circle";
      center: Vec2Like;
      radius: number;
  }>;
  /** Runs CCW from startAngle to endAngle (radians; DXF ARC convention). */
  export type Arc = Styled<{
      type: "arc";
      center: Vec2Like;
      radius: number;
      startAngle: number;
      endAngle: number;
  }>;
  /** majorAxis = endpoint vector from center; ratio = minor/major in (0, 1]. */
  export type Ellipse = Styled<{
      type: "ellipse";
      center: Vec2Like;
      majorAxis: Vec2Like;
      ratio: number;
      startAngle?: number;
      endAngle?: number;
  }>;
  export type Hatch = Styled<{
      type: "hatch";
      /** loops[0] = outer boundary, the rest are holes (even-odd). */
      loops: readonly {
          points: readonly PolylineVertexLike[];
      }[];
      fill?: {
          kind: "solid";
      } | {
          kind: "lines";
          angle: number;
          spacing: number;
      };
      /** Pattern spacing multiplier. */
      scale?: number;
  }>;
  export type Text = Styled<{
      type: "text";
      position: Vec2Like;
      content: string;
      rotation?: number;
      /** Where the text SITS relative to the point. */
      hAlign?: "left" | "center" | "right";
      vAlign?: "bottom" | "center" | "top";
      /** MLEADER-style arrow polylines pointing at the text (arrowhead at [0]). */
      leaderLines?: readonly (readonly Vec2Like[])[];
      /** Style overrides; absent keys inherit the document text style. */
      styleOverride?: {
          font?: string;
          widthFactor?: number;
          /** Cap height in mm (before `scale`). */
          textHeight?: number;
          arrowSize?: number;
          arrowType?: "filled" | "open" | "tick" | "dot" | "none";
      };
      /** Size multiplier for height + arrow size. */
      scale?: number;
  }>;
  export type Dimension = Styled<{
      type: "dimension";
      kind?: "linear" | "angular" | "radial" | "diameter";
      /** linear: 2+ chained points (measured point to point); angular: [vertex, a, b]; radial: [center, p]; diameter: [p1, p2]. */
      points: readonly Vec2Like[];
      /** Dimension line offset from the kind's anchor (points[0]; diameter: the
       * points' midpoint). anchor + offset lies on the dimension line (angular:
       * on the arc; radial/diameter: at the text). */
      offset: Vec2Like;
      textOverride?: string;
      styleOverride?: {
          textHeight?: number;
          arrowSize?: number;
          arrowType?: "filled" | "open" | "tick" | "dot" | "none";
          /** "short" = a 2×overshoot tick across the dimension line. */
          extensionType?: "long" | "short";
          extensionOffset?: number;
          extensionOvershoot?: number;
          textOffset?: number;
          precision?: number;
      };
      /** Annotation size multiplier (text/arrows/offsets). */
      scale?: number;
  }>;
  /** Nested block instance (inputs may hold points, never object references). */
  export type Block = Styled<{
      type: "block";
      definitionId: string;
      /** Applied last, about the pivot (the first input point). */
      rotation?: number;
      scale?: number;
      params?: Record<string, number | string | boolean>;
      /** Input points in the PARENT's local coords; the first is the pivot. */
      inputs?: readonly Vec2Like[];
  }>;
  export type ModelObject = Line | Point | Polyline | Circle | Arc | Ellipse | Hatch | Text | Dimension | Block;
  /** Identity + shared style fields every stored object carries. */
  export type StoredObjectBase = {
      id: string;
      layerId: string;
      /** #rrggbb override; absent = by layer. */
      color?: string;
      lineType?: string;
      lineTypeScale?: number;
      lineWidth?: number;
      /** Paint opacity 0..1; absent = opaque. */
      opacity?: number;
  };
  /** Flattens base + per-type fields so hovers list every member inline
   * (same trick as Styled<T> for the authoring DTOs). */
  type StoredShape<T> = {
      [K in keyof (T & StoredObjectBase)]: (T & StoredObjectBase)[K];
  } & {};
  /** Stored polyline vertex — bulge always present (default 0 applied). */
  export type StoredPolylineVertex = {
      x: number;
      y: number;
      bulge: number;
  };
  export type StoredLine = StoredShape<{
      type: "line";
      a: Vec2;
      b: Vec2;
  }>;
  export type StoredPoint = StoredShape<{
      type: "point";
      p: Vec2;
  }>;
  export type StoredPolyline = StoredShape<{
      type: "polyline";
      points: readonly StoredPolylineVertex[];
      closed: boolean;
  }>;
  export type StoredCircle = StoredShape<{
      type: "circle";
      center: Vec2;
      radius: number;
  }>;
  export type StoredArc = StoredShape<{
      type: "arc";
      center: Vec2;
      radius: number;
      startAngle: number;
      endAngle: number;
  }>;
  export type StoredEllipse = StoredShape<{
      type: "ellipse";
      center: Vec2;
      majorAxis: Vec2;
      ratio: number;
      startAngle: number;
      endAngle: number;
  }>;
  export type StoredHatchFill = {
      kind: "solid";
  } | {
      kind: "pattern";
      name: string;
      angle: number;
      scale: number;
  } | {
      kind: "lines";
      angle: number;
      spacing: number;
  };
  export type StoredHatch = StoredShape<{
      type: "hatch";
      /** loops[0] = outer boundary, the rest are holes (even-odd). */
      loops: readonly {
          points: readonly StoredPolylineVertex[];
      }[];
      fill: StoredHatchFill;
      scale: number;
  }>;
  export type StoredText = StoredShape<{
      type: "text";
      position: Vec2;
      content: string;
      leaderLines: readonly (readonly Vec2[])[];
      /** Word-wrap / frame width in mm; absent = no wrapping. */
      width?: number;
      hAlign: "left" | "center" | "right";
      vAlign: "bottom" | "center" | "top";
      frame?: "none" | "rectangle" | "bottom";
      styleId?: string;
      /** Only the keys the user actually overrode on this text. */
      styleOverride?: {
          font?: string;
          widthFactor?: number;
          textHeight?: number;
          arrowType?: "filled" | "open" | "tick" | "dot" | "none";
          arrowSize?: number;
      };
      rotation: number;
      scale: number;
  }>;
  export type StoredDimension = StoredShape<{
      type: "dimension";
      kind: "linear" | "angular" | "radial" | "diameter";
      points: readonly Vec2[];
      offset: Vec2;
      textOverride?: string;
      styleId?: string;
      /** Only the keys the user actually overrode on this dimension. */
      styleOverride?: {
          font?: string;
          widthFactor?: number;
          textHeight?: number;
          textOffset?: number;
          arrowType?: "filled" | "open" | "tick" | "dot" | "none";
          arrowSize?: number;
          extensionType?: "long" | "short";
          extensionOffset?: number;
          extensionOvershoot?: number;
          precision?: number;
      };
      scale: number;
  }>;
  export type StoredBlock = StoredShape<{
      type: "block";
      definitionId: string;
      rotation: number;
      scale: number;
      params: Readonly<Record<string, number | string | boolean>>;
      /** World points and/or referenced object ids, in pick order. */
      inputs: readonly (Vec2 | string)[];
  }>;
  /** Paper-space window into model space; exists only in layout spaces. */
  export type StoredViewport = StoredShape<{
      type: "viewport";
      rect: {
          x: number;
          y: number;
          w: number;
          h: number;
      };
      modelCenter: Vec2;
      /** Drawing-scale denominator (model mm per paper mm); 1:50 => 50. */
      scale: number;
      locked: boolean;
      hiddenLayerIds: readonly string[];
  }>;
  /** Raster reference; pixels live in the document's assets map. */
  export type StoredImage = StoredShape<{
      type: "image";
      assetId: string;
      origin: Vec2;
      width: number;
      height: number;
      rotation: number;
  }>;
  /** Any object as stored in the document — what reads hand to scripts. */
  export type StoredObject = StoredLine | StoredPoint | StoredPolyline | StoredCircle | StoredArc | StoredEllipse | StoredHatch | StoredText | StoredDimension | StoredBlock | StoredViewport | StoredImage;
  /**
   * One choice of a "Select" parameter: the value (what scripts receive) with
   * an optional properties-panel label. A plain string is shorthand for
   * `{ value }`.
   */
  export type ParameterOption = string | {
      value: string;
      label?: string;
  };
  /**
   * One entry of the module's optional `params` export — the block's
   * parameters table. `name` is the key scripts read from `params`, `label`
   * the properties-panel caption (defaults to the name).
   */
  export type ParamDef = {
      name: string;
      label?: string;
      type: "number";
      default: number;
      min?: number;
      max?: number;
  } | {
      name: string;
      label?: string;
      type: "string";
      default: string;
  } | {
      name: string;
      label?: string;
      type: "boolean";
      default: boolean;
  } | {
      name: string;
      label?: string;
      type: "enum";
      default: string;
      options: readonly ParameterOption[];
  };
  /**
   * The block's parameters table — what the `params` member of a BlockSpec
   * declares (or its function form returns).
   */
  export type BlockParamDefs = readonly ParamDef[];
  /** What the script's `draw` export must return. */
  export type BlockScriptResult = ModelObject[];
  /** The value an enum option denotes (its string, or `value` of the record form). */
  type OptionValue<O extends ParameterOption> = O extends string ? O : O extends {
      value: infer V extends string;
  } ? V : never;
  /** The runtime value type of one `params` table entry. */
  type ParamValue<Q extends ParamDef> = Q extends {
      type: "enum";
  } ? OptionValue<Q["options"][number]> : Q extends {
      type: "number";
  } ? number : Q extends {
      type: "boolean";
  } ? boolean : string;
  /**
   * The values record a params table produces: each entry's `name` maps to
   * its runtime value type (number/string/boolean, or the enum's option
   * union). This is what `draw`/`place`/`paramVisibility` receive as
   * `params` — inside defineBlock the table type is inferred, so authors
   * never spell this out. Unwraps the function form of `params`; a non-table
   * type (an already-derived values record, or the open BlockParams default)
   * passes through unchanged.
   */
  export type ParamValues<P> = P extends () => infer R ? ParamValues<R> : P extends readonly (infer Q extends ParamDef)[] ? {
      readonly [E in Q as E["name"]]: ParamValue<E>;
  } : P;

  // ——— Script contract ———

  // #region BlockParams
  /**
   * The open fallback for a block's parameter values, by name. Inside
   * defineBlock the precise per-parameter types are inferred from the
   * `params` member, so this record is only what untyped contexts see.
   */
  export interface BlockParams {
    readonly [name: string]: string | number | boolean;
  }
  // #endregion BlockParams

  /**
   * The inputs `place` acquired at insertion, in pick order: points or
   * object ids (what `pickObject` resolved). This is the STORED form —
   * by the time they reach `draw`, ids have been resolved (see
   * ResolvedInput).
   */
  export type BlockInputs = readonly (Vec2 | string)[];

  /**
   * A referenced document object as `draw` receives it: the STORED record
   * (schema output — defaults applied, points always {x, y}, id/layerId
   * present; see StoredObject), localized against the instance pivot like
   * every point input. Null when the reference no longer resolves (the
   * object was deleted) — handle it or throw (a throw shows as the
   * instance's evaluation error).
   */
  export type ResolvedObject = StoredObject | null;

  /**
   * How one stored input arrives at `draw`: points pass through
   * (pivot-localized), object ids resolve to the referenced object (or
   * null). Distributes over Vec2 | string for untyped positions.
   */
  export type ResolvedInput<T> = T extends string
    ? ResolvedObject
    : T extends Vec2
      ? T
      : Vec2 | ResolvedObject;

  /**
   * ResolvedInput applied position-wise. Homomorphic over the bare type
   * parameter ON PURPOSE — inlining `keyof Awaited<R>` into PlaceInputs
   * would map over the array's methods too and destroy tuple-ness.
   */
  export type ResolveInputs<T extends BlockInputs> = {
    readonly [K in keyof T]: ResolvedInput<T[K]>;
  };

  /**
   * The argument of an interactive `place` — runs once at insertion;
   * await the pickers for whatever inputs the block needs and return them
   * as an array (catch the pick rejection to end an open-ended collection
   * when the user presses Escape). `params` holds the DEFAULT values (the
   * instance doesn't exist yet).
   */
  export interface PlaceProps<P = BlockParams> {
    params: ParamValues<P>;
    pickPoint: (label?: string) => Promise<Vec2>;
    pickObject: (label?: string) => Promise<string>;
  }

  // ——— defineBlock ———

  /**
   * What the `place` member of a BlockSpec accepts: an array of point
   * labels — the runtime picks one point per label, in order — or the same
   * interactive function a module-level `place` export would be.
   */
  export type PlaceSpec<P = BlockParams> =
    | readonly string[]
    | ((props: PlaceProps<P>) => BlockInputs | Promise<BlockInputs>);

  /**
   * The shape `previewInputs` must have for a given `place` member: a
   * label-array place pins the exact tuple length; otherwise any inputs
   * array. Points accept [x, y] tuples for authoring ergonomics.
   */
  export type PreviewInputs<Pl> = Pl extends readonly string[]
    ? { readonly [K in keyof Pl]: Vec2Like }
    : readonly (Vec2Like | string)[];

  /**
   * The inputs `draw` receives for a given `place` member: a label tuple
   * maps to a Vec2 tuple of the same length, a function contributes its
   * (awaited) return type with every position RESOLVED (string → the
   * referenced object or null, see ResolvedInput), and an absent `place`
   * is the single "Insertion point" pick. The undefined case is checked
   * FIRST and non-distributively: without strictNullChecks (e.g. a lax
   * host config), `undefined extends readonly string[]` is true and the
   * homomorphic mapped type would collapse to `undefined`.
   */
  export type PlaceInputs<Pl> = [Pl] extends [undefined]
    ? readonly [Vec2]
    : Pl extends readonly string[]
      ? { readonly [K in keyof Pl]: Vec2 }
      : Pl extends (...args: never) => infer R
        ? Awaited<R> extends BlockInputs
          ? ResolveInputs<Awaited<R>>
          : readonly (Vec2 | ResolvedObject)[]
        : readonly [Vec2];

  /**
   * One block as a single object: the same members the module-level
   * exports declare, gathered so TypeScript infers ACROSS them — `params`
   * types `draw`'s params, `place` types `draw`'s inputs — with no
   * typeof / satisfies / as-const annotations. See defineBlock.
   */
  export interface BlockSpec<
    P extends BlockParamDefs = readonly [],
    Pl extends PlaceSpec<P> | undefined = undefined,
  > {
    id: string;
    name: string;
    version?: string;
    description?: string;
    tags?: readonly string[];
    authors?: readonly string[];
    /**
     * Ids of block definitions `draw` emits instances of (e.g.
     * `["@lineadraw/axis"]`). Install, copy/paste, and export bundle the
     * declared closure; the save-time dry run rejects emitted instances
     * that are not declared here.
     */
    dependencies?: readonly string[];
    /** The parameter table, or a function returning it (data-at-end). */
    params?: P | (() => P);
    /**
     * Per-parameter visibility from the current values — pure, re-run per
     * properties-panel render. Names omitted stay visible; `false` hides
     * the row (the hidden value is KEPT and still reaches `draw`).
     */
    paramVisibility?: (props: {
      params: ParamValues<P>;
    }) => Partial<Record<keyof ParamValues<P> & string, boolean>>;
    /** Point labels (fixed picks) or an interactive function (see PlaceSpec). */
    place?: Pl;
    /**
     * Optional inputs used for the block's PREVIEW (panel/Library
     * thumbnails, marketplace cards, save-time dry run) instead of the
     * generic stand-in picks — curate them so the preview shows the block
     * at its best. Same shape `place` produces; points accept [x, y];
     * object-id strings resolve to a stand-in line in previews.
     */
    previewInputs?: PreviewInputs<Pl>;
    /**
     * Children in block-LOCAL coordinates (pure, runs per evaluation).
     * The first point input is the pivot; `inputs` arrive localized
     * against it, and the instance's rotation/scale apply last, about it.
     * Object picks arrive as the referenced object itself (pivot-local,
     * re-evaluated whenever it changes) or null once deleted.
     */
    draw: (props: {
      params: ParamValues<P>;
      inputs: PlaceInputs<Pl>;
    }) => BlockScriptResult;
  }

  /**
   * The recommended way to author a block: one call, one object, full
   * inference — no `typeof params`, no `satisfies`, no `as const`.
   *
   *   import { defineBlock } from "lineadraw";
   *
   *   export default defineBlock({
   *     id: "…",
   *     name: "Surface",
   *     params: [
   *       { name: "type", type: "enum", default: "rock", options: ["rock", "ground"] },
   *     ],
   *     place: ["Start point", "End point"],
   *     draw: ({ params, inputs: [start, end] }) => {
   *       params.type; // "rock" | "ground"
   *       return [{ type: "line", a: start, b: end }];
   *     },
   *   });
   *
   * At runtime defineBlock is the identity function. The module-level
   * export form remains fully supported — a default-exported BlockSpec and
   * plain named exports describe the same block.
   */
  export function defineBlock<
    const P extends BlockParamDefs = readonly [],
    const L extends readonly string[] | undefined = undefined,
  >(spec: BlockSpec<P, L>): BlockSpec<P, L>;
  // Function-form place: the props type is concrete (from P) and only the
  // RETURN is inferred — inferring a whole context-sensitive function into
  // a type parameter would fall back to its default.
  export function defineBlock<
    const P extends BlockParamDefs = readonly [],
    const R extends BlockInputs | Promise<BlockInputs> = BlockInputs,
  >(
    spec: BlockSpec<P, (props: PlaceProps<P>) => R>,
  ): BlockSpec<P, (props: PlaceProps<P>) => R>;

  // ——— Commands (macro scripts) ———

  /** An axis-aligned box in world mm. */
  export type Box = { minX: number; minY: number; maxX: number; maxY: number };

  /** Filters for CommandDocument.query — all present filters AND together. */
  export interface ObjectQuery {
    ids?: readonly string[];
    type?: ModelObject["type"];
    /** Layer name or id. */
    layer?: string;
    /** #rrggbb override (objects without one inherit from their layer). */
    color?: string;
    lineType?: string;
    /** Substring match on text content. */
    content?: string;
    /** Bounds intersect this box. */
    bbox?: Box;
    /** Bounds entirely inside this box. */
    inside?: Box;
    /** Geometry within `tol` mm of `point`. */
    near?: { point: Vec2Like; tol: number };
  }

  /** A STORED object as query() returns it (see StoredObject — schema
   * output: defaults applied, points always {x, y}, identity present). */
  export type ExistingObject = StoredObject;

  /** Per-object measurements; null where the type has no natural value. */
  export type Measurement = {
    bbox: Box | null;
    length: number | null;
    area: number | null;
  };

  /**
   * The document as command scripts see it — the same session surface the
   * agent tools are written against. Angles are RADIANS, point-valued
   * arguments accept {x, y} or [x, y], `layer` resolves by name or id.
   * Object mutations target the ACTIVE space. Methods throw on invalid
   * input (an uncaught throw cancels the command and rolls its edits back).
   */
  export interface CommandDocument {
    /** Add objects (each may carry `layer` — a name — instead of an id);
     * returns the created ids. */
    add(
      objects: readonly (ModelObject & { layer?: string })[],
      opts?: { layout?: string },
    ): string[];
    /** Apply per-object patches (`{ id, ...changedFields }`). */
    update(entries: readonly ({ id: string } & Record<string, unknown>)[]): void;
    /** Delete by id (unknown ids are skipped); returns how many went. */
    remove(ids: readonly string[]): number;
    move(ids: readonly string[], delta: Vec2Like): void;
    rotate(ids: readonly string[], angleRad: number, center?: Vec2Like): void;
    scale(ids: readonly string[], factor: number, center?: Vec2Like): void;
    mirror(ids: readonly string[], axisA: Vec2Like, axisB: Vec2Like): void;
    /** Duplicate displaced by delta; returns the new ids. */
    copy(ids: readonly string[], delta: Vec2Like): string[];
    /** count TOTAL copies at multiples of delta; returns the new ids. */
    array(ids: readonly string[], count: number, delta: Vec2Like): string[];
    /** Filtered MODEL-space objects. */
    query(filter: ObjectQuery): ExistingObject[];
    /** bbox / curve length / enclosed area of one object. */
    measure(id: string): Measurement;
    listLayers(): {
      id: string;
      name: string;
      current: boolean;
      [key: string]: unknown;
    }[];
    /** Create a layer (unique name); returns its id. */
    addLayer(
      props: { name: string; color?: string } & Record<string, unknown>,
    ): string;
    updateLayer(nameOrId: string, patch: Record<string, unknown>): void;
    /** Remove an EMPTY, non-current layer. */
    removeLayer(nameOrId: string): void;
    setCurrentLayer(nameOrId: string): void;
    /** Create a paper layout; returns its id. `scale` accepts "1:50". */
    createLayout(
      name: string,
      opts: {
        sheet?: "A4" | "A3" | "A2" | "A1" | "A0" | { width: number; height: number };
        orientation?: "portrait" | "landscape";
        scale?: string;
      },
    ): string;
    /** Counts by type/layer, bbox, layer + layout names. */
    summary(): Record<string, unknown>;
  }

  /**
   * What `run` receives. The pickers and `prompt` REJECT when the user
   * cancels (Escape) — let that propagate to abort the command (all edits
   * roll back), or catch it to finish an open-ended collection gracefully.
   */
  export interface CommandContext {
    document: CommandDocument;
    /** Await one snapped world point. */
    pickPoint(label?: string): Promise<Vec2>;
    /** Await one object click; resolves the object's id. */
    pickObject(label?: string): Promise<string>;
    /** Ids currently selected — a snapshot; call again after changes. */
    selection(): string[];
    setSelection(ids: readonly string[]): void;
    /** Await a typed value from a small input dialog. */
    prompt(
      message: string,
      options?: { initial?: string; placeholder?: string },
    ): Promise<string>;
    showToast(message: string, kind?: "info" | "success" | "error"): void;
  }

  /** One user command (macro): identity, metadata, and the `run` body. */
  export interface CommandSpec {
    id: string;
    name: string;
    description?: string;
    version?: string;
    authors?: readonly string[];
    tags?: readonly string[];
    /**
     * The macro body. The whole call is ONE undo step: mutations apply
     * live while it runs; cancelling (Escape during a pick/prompt) or an
     * uncaught error rolls everything back.
     */
    run(ctx: CommandContext): void | Promise<void>;
  }

  /**
   * The way to author a user command: one call, one object. At runtime
   * defineCommand is the identity function.
   *
   *   import { defineCommand } from "lineadraw";
   *
   *   export default defineCommand({
   *     id: "…",
   *     name: "Number the selected texts",
   *     run: async ({ document, prompt, selection, showToast }) => {
   *       const start = Number(await prompt("First number", { initial: "1" }));
   *       const texts = document
   *         .query({ ids: selection(), type: "text" });
   *       texts.forEach((t, i) =>
   *         document.update([{ id: t.id, content: String(start + i) }]),
   *       );
   *       showToast(`Numbered ${texts.length} texts`, "success");
   *     },
   *   });
   */
  export function defineCommand(spec: CommandSpec): CommandSpec;
}

declare module "lineadraw/helpers" {
  /** A 2D point (mm, y-up). A type ALIAS so editor hovers expand its shape. */
  export type Vec2 = {
      x: number;
      y: number;
  };
  /** [0, 1, ..., n-1] — handy for repeating geometry. */
  export const range: (n: number) => number[];
  /** Point at `distance` from `p` in direction `angle` (radians, CCW). */
  export const polar: (angle: number, distance: number, p?: Vec2) => Vec2;
  /** Radians → degrees. */
  export const toDeg: (r: number) => number;
  /** Degrees → radians. */
  export const toRad: (d: number) => number;
  /** Length of a vector/point. */
  export const len: (p: Vec2) => number;
  /** Distance between two points. */
  export const dist: (a: Vec2, b: Vec2) => number;
  /** Vector/point sum. */
  export const add: (a: Vec2, b: Vec2) => Vec2;
  /** Vector/point difference (a − b). */
  export const sub: (a: Vec2, b: Vec2) => Vec2;
  /** Scale a vector by a factor. */
  export const scale: (p: Vec2, s: number) => Vec2;
  /** Unit vector (a zero vector stays zero). */
  export const norm: (p: Vec2) => Vec2;
  /** Dot product. */
  export const dot: (a: Vec2, b: Vec2) => number;
  /** Rotate vector by `angle` (radians, CCW). */
  export const rotate: (p: Vec2, angle: number) => Vec2;
  /**
   * All helpers as one object — what migration-wrapped legacy scripts receive
   * via `import { helpers } from "lineadraw"`. New scripts import the named
   * functions from "lineadraw/helpers" instead.
   */
  export const helpers: Readonly<{
      range: (n: number) => number[];
      polar: (angle: number, distance: number, p?: Vec2) => Vec2;
      toDeg: (r: number) => number;
      toRad: (d: number) => number;
      len: (p: Vec2) => number;
      dist: (a: Vec2, b: Vec2) => number;
      add: (a: Vec2, b: Vec2) => Vec2;
      sub: (a: Vec2, b: Vec2) => Vec2;
      scale: (p: Vec2, s: number) => Vec2;
      norm: (p: Vec2) => Vec2;
      dot: (a: Vec2, b: Vec2) => number;
      rotate: (p: Vec2, angle: number) => Vec2;
  }>;
}

// The same declarations again at GLOBAL scope, so scripts can annotate
// without importing. Structurally identical to the "lineadraw" exports, so the
// two mix freely. Requires a DOM-less lib (blocks/tsconfig and the in-app
// editor both use lib es2022) — with lib.dom, `Text` would collide.
/** A 2D point (mm, y-up). Point-valued fields also accept [x, y]. */
type Vec2 = {
    x: number;
    y: number;
};
type Vec2Like = Vec2 | readonly [number, number];
/** Polyline vertex; bulge = tan(sweep/4), 0 = straight. Accepts [x, y, bulge?]. */
type PolylineVertexLike = {
    x: number;
    y: number;
    bulge?: number;
} | readonly [number, number, number?];
/** Style overrides children may carry (otherwise inherited from the instance). */
type BaseStyle = {
    /** #rrggbb; absent = by layer. */
    color?: string;
    /** Line type; absent = by layer. */
    lineType?: string;
    /** Dash-pattern length multiplier; absent = 1. */
    lineTypeScale?: number;
    /** Line weight in mm; absent = by layer. */
    lineWidth?: number;
};
/**
 * T plus the shared style fields, FLATTENED (the homomorphic map forces the
 * intersection to resolve): hovers then list every member inline instead of
 * the opaque `BaseStyle & { … }` — the block editor has no expand-type
 * affordance, so the alias display is all a script author gets.
 */
type Styled<T> = {
    [K in keyof (T & BaseStyle)]: (T & BaseStyle)[K];
} & {};
type Line = Styled<{
    type: "line";
    a: Vec2Like;
    b: Vec2Like;
}>;
/** A point: paints as a round dot whose diameter is the lineWidth. */
type Point = Styled<{
    type: "point";
    p: Vec2Like;
}>;
type Polyline = Styled<{
    type: "polyline";
    /** At least 2 vertices. */
    points: readonly PolylineVertexLike[];
    closed?: boolean;
}>;
type Circle = Styled<{
    type: "circle";
    center: Vec2Like;
    radius: number;
}>;
/** Runs CCW from startAngle to endAngle (radians; DXF ARC convention). */
type Arc = Styled<{
    type: "arc";
    center: Vec2Like;
    radius: number;
    startAngle: number;
    endAngle: number;
}>;
/** majorAxis = endpoint vector from center; ratio = minor/major in (0, 1]. */
type Ellipse = Styled<{
    type: "ellipse";
    center: Vec2Like;
    majorAxis: Vec2Like;
    ratio: number;
    startAngle?: number;
    endAngle?: number;
}>;
type Hatch = Styled<{
    type: "hatch";
    /** loops[0] = outer boundary, the rest are holes (even-odd). */
    loops: readonly {
        points: readonly PolylineVertexLike[];
    }[];
    fill?: {
        kind: "solid";
    } | {
        kind: "lines";
        angle: number;
        spacing: number;
    };
    /** Pattern spacing multiplier. */
    scale?: number;
}>;
type Text = Styled<{
    type: "text";
    position: Vec2Like;
    content: string;
    rotation?: number;
    /** Where the text SITS relative to the point. */
    hAlign?: "left" | "center" | "right";
    vAlign?: "bottom" | "center" | "top";
    /** MLEADER-style arrow polylines pointing at the text (arrowhead at [0]). */
    leaderLines?: readonly (readonly Vec2Like[])[];
    /** Style overrides; absent keys inherit the document text style. */
    styleOverride?: {
        font?: string;
        widthFactor?: number;
        /** Cap height in mm (before `scale`). */
        textHeight?: number;
        arrowSize?: number;
        arrowType?: "filled" | "open" | "tick" | "dot" | "none";
    };
    /** Size multiplier for height + arrow size. */
    scale?: number;
}>;
type Dimension = Styled<{
    type: "dimension";
    kind?: "linear" | "angular" | "radial" | "diameter";
    /** linear: 2+ chained points (measured point to point); angular: [vertex, a, b]; radial: [center, p]; diameter: [p1, p2]. */
    points: readonly Vec2Like[];
    /** Dimension line offset from the kind's anchor (points[0]; diameter: the
     * points' midpoint). anchor + offset lies on the dimension line (angular:
     * on the arc; radial/diameter: at the text). */
    offset: Vec2Like;
    textOverride?: string;
    styleOverride?: {
        textHeight?: number;
        arrowSize?: number;
        arrowType?: "filled" | "open" | "tick" | "dot" | "none";
        /** "short" = a 2×overshoot tick across the dimension line. */
        extensionType?: "long" | "short";
        extensionOffset?: number;
        extensionOvershoot?: number;
        textOffset?: number;
        precision?: number;
    };
    /** Annotation size multiplier (text/arrows/offsets). */
    scale?: number;
}>;
/** Nested block instance (inputs may hold points, never object references). */
type Block = Styled<{
    type: "block";
    definitionId: string;
    /** Applied last, about the pivot (the first input point). */
    rotation?: number;
    scale?: number;
    params?: Record<string, number | string | boolean>;
    /** Input points in the PARENT's local coords; the first is the pivot. */
    inputs?: readonly Vec2Like[];
}>;
type ModelObject = Line | Point | Polyline | Circle | Arc | Ellipse | Hatch | Text | Dimension | Block;
/** Identity + shared style fields every stored object carries. */
type StoredObjectBase = {
    id: string;
    layerId: string;
    /** #rrggbb override; absent = by layer. */
    color?: string;
    lineType?: string;
    lineTypeScale?: number;
    lineWidth?: number;
    /** Paint opacity 0..1; absent = opaque. */
    opacity?: number;
};
/** Flattens base + per-type fields so hovers list every member inline
 * (same trick as Styled<T> for the authoring DTOs). */
type StoredShape<T> = {
    [K in keyof (T & StoredObjectBase)]: (T & StoredObjectBase)[K];
} & {};
/** Stored polyline vertex — bulge always present (default 0 applied). */
type StoredPolylineVertex = {
    x: number;
    y: number;
    bulge: number;
};
type StoredLine = StoredShape<{
    type: "line";
    a: Vec2;
    b: Vec2;
}>;
type StoredPoint = StoredShape<{
    type: "point";
    p: Vec2;
}>;
type StoredPolyline = StoredShape<{
    type: "polyline";
    points: readonly StoredPolylineVertex[];
    closed: boolean;
}>;
type StoredCircle = StoredShape<{
    type: "circle";
    center: Vec2;
    radius: number;
}>;
type StoredArc = StoredShape<{
    type: "arc";
    center: Vec2;
    radius: number;
    startAngle: number;
    endAngle: number;
}>;
type StoredEllipse = StoredShape<{
    type: "ellipse";
    center: Vec2;
    majorAxis: Vec2;
    ratio: number;
    startAngle: number;
    endAngle: number;
}>;
type StoredHatchFill = {
    kind: "solid";
} | {
    kind: "pattern";
    name: string;
    angle: number;
    scale: number;
} | {
    kind: "lines";
    angle: number;
    spacing: number;
};
type StoredHatch = StoredShape<{
    type: "hatch";
    /** loops[0] = outer boundary, the rest are holes (even-odd). */
    loops: readonly {
        points: readonly StoredPolylineVertex[];
    }[];
    fill: StoredHatchFill;
    scale: number;
}>;
type StoredText = StoredShape<{
    type: "text";
    position: Vec2;
    content: string;
    leaderLines: readonly (readonly Vec2[])[];
    /** Word-wrap / frame width in mm; absent = no wrapping. */
    width?: number;
    hAlign: "left" | "center" | "right";
    vAlign: "bottom" | "center" | "top";
    frame?: "none" | "rectangle" | "bottom";
    styleId?: string;
    /** Only the keys the user actually overrode on this text. */
    styleOverride?: {
        font?: string;
        widthFactor?: number;
        textHeight?: number;
        arrowType?: "filled" | "open" | "tick" | "dot" | "none";
        arrowSize?: number;
    };
    rotation: number;
    scale: number;
}>;
type StoredDimension = StoredShape<{
    type: "dimension";
    kind: "linear" | "angular" | "radial" | "diameter";
    points: readonly Vec2[];
    offset: Vec2;
    textOverride?: string;
    styleId?: string;
    /** Only the keys the user actually overrode on this dimension. */
    styleOverride?: {
        font?: string;
        widthFactor?: number;
        textHeight?: number;
        textOffset?: number;
        arrowType?: "filled" | "open" | "tick" | "dot" | "none";
        arrowSize?: number;
        extensionType?: "long" | "short";
        extensionOffset?: number;
        extensionOvershoot?: number;
        precision?: number;
    };
    scale: number;
}>;
type StoredBlock = StoredShape<{
    type: "block";
    definitionId: string;
    rotation: number;
    scale: number;
    params: Readonly<Record<string, number | string | boolean>>;
    /** World points and/or referenced object ids, in pick order. */
    inputs: readonly (Vec2 | string)[];
}>;
/** Paper-space window into model space; exists only in layout spaces. */
type StoredViewport = StoredShape<{
    type: "viewport";
    rect: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    modelCenter: Vec2;
    /** Drawing-scale denominator (model mm per paper mm); 1:50 => 50. */
    scale: number;
    locked: boolean;
    hiddenLayerIds: readonly string[];
}>;
/** Raster reference; pixels live in the document's assets map. */
type StoredImage = StoredShape<{
    type: "image";
    assetId: string;
    origin: Vec2;
    width: number;
    height: number;
    rotation: number;
}>;
/** Any object as stored in the document — what reads hand to scripts. */
type StoredObject = StoredLine | StoredPoint | StoredPolyline | StoredCircle | StoredArc | StoredEllipse | StoredHatch | StoredText | StoredDimension | StoredBlock | StoredViewport | StoredImage;
/**
 * One choice of a "Select" parameter: the value (what scripts receive) with
 * an optional properties-panel label. A plain string is shorthand for
 * `{ value }`.
 */
type ParameterOption = string | {
    value: string;
    label?: string;
};
/**
 * One entry of the module's optional `params` export — the block's
 * parameters table. `name` is the key scripts read from `params`, `label`
 * the properties-panel caption (defaults to the name).
 */
type ParamDef = {
    name: string;
    label?: string;
    type: "number";
    default: number;
    min?: number;
    max?: number;
} | {
    name: string;
    label?: string;
    type: "string";
    default: string;
} | {
    name: string;
    label?: string;
    type: "boolean";
    default: boolean;
} | {
    name: string;
    label?: string;
    type: "enum";
    default: string;
    options: readonly ParameterOption[];
};
/**
 * The block's parameters table — what the `params` member of a BlockSpec
 * declares (or its function form returns).
 */
type BlockParamDefs = readonly ParamDef[];
/** What the script's `draw` export must return. */
type BlockScriptResult = ModelObject[];
/** The value an enum option denotes (its string, or `value` of the record form). */
type OptionValue<O extends ParameterOption> = O extends string ? O : O extends {
    value: infer V extends string;
} ? V : never;
/** The runtime value type of one `params` table entry. */
type ParamValue<Q extends ParamDef> = Q extends {
    type: "enum";
} ? OptionValue<Q["options"][number]> : Q extends {
    type: "number";
} ? number : Q extends {
    type: "boolean";
} ? boolean : string;
/**
 * The values record a params table produces: each entry's `name` maps to
 * its runtime value type (number/string/boolean, or the enum's option
 * union). This is what `draw`/`place`/`paramVisibility` receive as
 * `params` — inside defineBlock the table type is inferred, so authors
 * never spell this out. Unwraps the function form of `params`; a non-table
 * type (an already-derived values record, or the open BlockParams default)
 * passes through unchanged.
 */
type ParamValues<P> = P extends () => infer R ? ParamValues<R> : P extends readonly (infer Q extends ParamDef)[] ? {
    readonly [E in Q as E["name"]]: ParamValue<E>;
} : P;

// Script-contract globals: aliases into the module (not re-declarations),
// so the in-app editor's BlockParams substitution flows through them.
declare type BlockParams = import("lineadraw").BlockParams;
declare type BlockInputs = import("lineadraw").BlockInputs;
declare type ResolvedObject = import("lineadraw").ResolvedObject;
declare type ResolvedInput<T> = import("lineadraw").ResolvedInput<T>;
declare type PlaceProps<P = BlockParams> = import("lineadraw").PlaceProps<P>;
declare type PlaceSpec<P = BlockParams> = import("lineadraw").PlaceSpec<P>;
declare type PlaceInputs<Pl> = import("lineadraw").PlaceInputs<Pl>;
declare type PreviewInputs<Pl> = import("lineadraw").PreviewInputs<Pl>;
declare type BlockSpec<
  P extends import("lineadraw").BlockParamDefs = readonly [],
  Pl extends PlaceSpec<P> | undefined = undefined,
> = import("lineadraw").BlockSpec<P, Pl>;
declare type Box = import("lineadraw").Box;
declare type ObjectQuery = import("lineadraw").ObjectQuery;
declare type ExistingObject = import("lineadraw").ExistingObject;
declare type Measurement = import("lineadraw").Measurement;
declare type CommandDocument = import("lineadraw").CommandDocument;
declare type CommandContext = import("lineadraw").CommandContext;
declare type CommandSpec = import("lineadraw").CommandSpec;
