import { debounce } from 'underscore';
import { Model } from '../common';
import { Module } from '../abstract';
import defaults, { TraitManagerConfig } from './config/config';
import TraitsView from './view/TraitsView';
import TraitView from './view/TraitView';
import TraitSelectView from './view/TraitSelectView';
import TraitCheckboxView from './view/TraitCheckboxView';
import TraitNumberView from './view/TraitNumberView';
import TraitColorView from './view/TraitColorView';
import TraitButtonView from './view/TraitButtonView';
import EditorModel from '../editor/model/Editor';
import Component from '../dom_components/model/Component';
import Trait from './model/Trait';
import Category from '../abstract/ModuleCategory';
import Categories from '../abstract/ModuleCategories';

export const evAll = 'trait';
export const evPfx = `${evAll}:`;
export const evCustom = `${evPfx}custom`;

const typesDef: { [id: string]: { new (o: any): TraitView } } = {
  text: TraitView,
  number: TraitNumberView,
  select: TraitSelectView,
  checkbox: TraitCheckboxView,
  color: TraitColorView,
  button: TraitButtonView,
};

interface ITraitView {
  noLabel?: TraitView['noLabel'];
  eventCapture?: TraitView['eventCapture'];
  templateInput?: TraitView['templateInput'];
  onEvent?: TraitView['onEvent'];
  onUpdate?: TraitView['onUpdate'];
  createInput?: TraitView['createInput'];
  createLabel?: TraitView['createLabel'];
}

export type CustomTrait<T> = ITraitView & T & ThisType<T & TraitView>;

export interface TraitManagerConfigModule extends TraitManagerConfig {
  pStylePrefix?: string;
  em: EditorModel;
}

export default class TraitManager extends Module<TraitManagerConfigModule> {
  view?: TraitsView;
  types: { [id: string]: { new (o: any): TraitView } };
  model: Model;
  __ctn?: any;
  categories: Categories;

  TraitsView = TraitsView;
  Category = Category;
  Categories = Categories;

  events = {
    all: evAll,
    custom: evCustom,
  };

  /**
   * Get configuration object
   * @name getConfig
   * @function
   * @return {Object}
   */

  /**
   * Initialize module
   * @private
   */
  constructor(em: EditorModel) {
    super(em, 'TraitManager', defaults as any);
    const model = new Model();
    this.model = model;
    this.types = typesDef;
    const ppfx = this.config.pStylePrefix;
    ppfx && (this.config.stylePrefix = `${ppfx}${this.config.stylePrefix}`);
    this.categories = new Categories();

    const upAll = debounce(() => this.__upSel(), 0);
    model.listenTo(em, 'component:toggled', upAll);

    const update = debounce(() => this.__onUp(), 0);
    model.listenTo(em, 'trait:update', update);

    return this;
  }

  __upSel() {
    this.select(this.em.getSelected());
  }

  __onUp() {
    this.select(this.getSelected());
  }

  select(component?: Component) {
    const traits = component ? component.getTraits() : [];
    this.model.set({ component, traits });
    this.__trgCustom();
  }

  getSelected(): Component | undefined {
    return this.model.get('component');
  }

  /**
   * Get traits from the currently selected component.
   */
  getCurrent(): Trait[] {
    return this.model.get('traits') || [];
  }

  __trgCustom(opts: any = {}) {
    this.__ctn = this.__ctn || opts.container;
    this.em.trigger(this.events.custom, { container: this.__ctn });
  }

  postRender() {
    this.__appendTo();
  }

  /**
   *
   * Get Traits viewer
   * @private
   */
  getTraitsViewer() {
    return this.view;
  }

  /**
   * Add new trait type
   * @param {string} name Type name
   * @param {Object} methods Object representing the trait
   */
  addType<T>(name: string, trait: CustomTrait<T>) {
    const baseView = this.getType('text');
    //@ts-ignore
    this.types[name] = baseView.extend(trait);
  }

  /**
   * Get trait type
   * @param {string} name Type name
   * @return {Object}
   */
  getType(name: string) {
    return this.getTypes()[name];
  }

  /**
   * Get all trait types
   * @returns {Object}
   */
  getTypes() {
    return this.types;
  }

  /**
   * Get all available categories.
   * @return {Array<Category>}
   */
  getCategories() {
    return [...this.categories.models];
  }

  render() {
    let { view } = this;
    const { categories, em } = this;
    view = new TraitsView(
      {
        el: view?.el,
        collection: [],
        editor: em,
        config: this.getConfig(),
        categories,
      },
      this.getTypes()
    );
    this.view = view;
    return view.el;
  }

  destroy() {
    const colls = [this.categories];
    colls.forEach(c => {
      c.stopListening();
      c.reset();
    });
    this.model.stopListening();
    this.model.clear();
    this.view?.remove();
  }
}
