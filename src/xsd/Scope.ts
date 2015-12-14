// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as types from '../XsdTypes';
import {QName} from './QName'

export class Scope {
	constructor(parent: Scope) {
		this.parent = parent;
	}

	add(name: QName, type: string, target: any) {
		var tbl = this.data[type];

		if(!tbl) {
			tbl = {} as {[name: string]: any};
			this.data[type] = tbl;
		}

		tbl[name.nameFull] = target;
	}

	addToParent(name: QName, type: string, target: any) {
		this.parent.add(name, type, target);
	}

	lookup(name: QName, type: string): any {
		var scope: Scope = this;

		while(scope) {
			if(scope.data[type]) {
				var result = scope.data[type][name.nameFull];

				if(result) return(result);
			}

			scope = scope.parent;
		}

		return(null);
	}

	// Elements

	addElement(element: types.XsdElement) {
		if(!this.elementList) this.elementList = [];

		this.elementList.push(element);
	}

	replaceElement(elementOld: types.XsdElement, elementNew: types.XsdElement) {
		if(!this.elementList) return;

		this.elementList.forEach((element: types.XsdElement, index: number) => {
			if(element == elementOld) this.elementList[index] = elementNew;
		});
	}

	addElementToParent(element: types.XsdElement) {
		this.parent.addElement(element);
	}

	/** Add group contents to parent. */

	addElementsToParent(target?: Scope) {
		if(!this.elementList) return;
		if(!target) target = this;
		target = target.parent;

		for(var element of this.elementList) {
			target.addElement(element);
		}
	}

	// Attributes

	addAttribute(attribute: types.XsdAttribute) {
		if(!this.attributeList) this.attributeList = [];

		this.attributeList.push(attribute);
	}

	addAttributeToParent(attribute: types.XsdAttribute) {
		this.parent.addAttribute(attribute);
	}

	/** Add attribute group contents to parent. */

	addAttributesToParent(target?: Scope) {
		if(!this.attributeList) return;
		if(!target) target = this;
		target = target.parent;

		for(var attribute of this.attributeList) {
			target.addAttribute(attribute);
		}
	}

	// Types

	addType(type: types.XsdTypeBase) {
		if(!this.typeList) this.typeList = [];

		this.typeList.push(type);
	}

	addTypeToParent(type: types.XsdTypeBase) {
		this.parent.addType(type);
	}

	getTypeList() {
		return(this.typeList);
	}

	getTypeCount() {
		return(this.typeList ? this.typeList.length : 0);
	}

	private parent: Scope;

	private data: {[type: string]: {[name: string]: any}} = {};

	private attributeGroupTbl: {[name: string]: types.XsdAttributeGroup};
	private groupTbl: {[name: string]: types.XsdGroup};

	private elementList: types.XsdElement[];
	private attributeList: types.XsdAttribute[];
	private typeList: types.XsdTypeBase[];
}
