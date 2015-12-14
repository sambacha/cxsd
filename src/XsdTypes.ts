// This file is part of fast-xml, copyright (c) 2015 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as url from 'url';

import {State, Rule} from './XsdState';
import {XsdParser} from './XsdParser';
import {Namespace} from './xsd/Namespace';
import {Source} from './xsd/Source';
import {Scope} from './xsd/Scope'
import {QName} from './xsd/QName'

export type XmlAttribute = string | number;
type XmlAttributeTbl = {[name: string]: XmlAttribute};




// Common base for all schema tags

export interface XsdBaseClass {
	new(...args: any[]): XsdBase;
	mayContain(): XsdBaseClass[];

	name: string;
	rule: Rule;
}

export class XsdBase {
	static mayContain = () => ([] as XsdBaseClass[]);
	constructor(scope: Scope) {
		this.scope = scope;
	}
	init(state: State) {}
	finish(state: State) {}

	scope: Scope;

	static name: string;
	static rule: Rule;
}




// Schema root

export class XsdRoot extends XsdBase {
	static mayContain = () => [
		XsdSchema
	];
}

// <xsd:schema>

export class XsdSchema extends XsdBase {
	static mayContain = () => [
		XsdImport,
		XsdInclude,
		XsdAttributeGroup,
		XsdSimpleType,
		XsdComplexType,
		XsdGroup,
		XsdAttribute,
		XsdElement
	];

	init(state: State) {
		// Ultimately the schema exports elements and types in the global scope
		// (meaning they are children of this, the root element).

		state.stateStatic.root = this;
		state.stateStatic.source.parse(state.attributeTbl);
	}
}




// Element support

export class XsdElementBase extends XsdBase {
	id: string = null;
	minOccurs: number = 1;
	maxOccurs: number = 1;
}

// <xsd:element>

export class XsdElement extends XsdElementBase {
	static mayContain = () => [
		XsdSimpleType,
		XsdComplexType
	];

	init(state: State) {
		if(this.name) this.scope.addToParent(new QName(this.name, state.stateStatic.source), 'element', this);
	}

	finish(state: State) {
		var element = this;

		if(this.ref) {
			// Replace this with another, referenced element.

			var ref = new QName(this.ref, state.stateStatic.source);
			element = this.scope.lookup(ref, 'element');
		}

		if(element) this.scope.addElementToParent(element);
//if(!element) console.log(ref)

		// If the element has a type set through an attribute, look it up in scope.

		if(this.type) {
			var type = new QName(this.type as string, state.stateStatic.source);
			this.type = this.scope.lookup(type, 'type') as XsdTypeBase || type;
		}

		// If there's a single type as a child, use it as the element's type.

		if(!this.type && this.scope.getTypeCount() == 1) {
			this.type = this.scope.getTypeList()[0];
		}
	}

	name: string = null;
	ref: string = null;
	type: string | QName | XsdTypeBase = null;
	default: string = null;
}

export class XsdGroupBase extends XsdElementBase {
}

export class XsdGenericChildList extends XsdGroupBase {
	static mayContain: () => XsdBaseClass[] = () => [
		XsdElement,
		XsdGroup,
		XsdSequence,
		XsdChoice
	];

	finish(state: State) {
		this.scope.addElementsToParent();
	}
}

// <xsd:sequence>

export class XsdSequence extends XsdGenericChildList {
}

// <xsd:choice>

export class XsdChoice extends XsdGenericChildList {
}

// <xsd:group>

export class XsdGroup extends XsdGroupBase {
	static mayContain: () => XsdBaseClass[] = () => [
		XsdSequence,
		XsdChoice
	];

	init(state: State) {
		if(this.name) {
			this.scope.addToParent(new QName(this.name, state.stateStatic.source), 'group', this);
		}
	}

	finish(state: State) {
		var group = this;

		if(this.ref) {
			var ref = new QName(this.ref, state.stateStatic.source);
			group = this.scope.lookup(ref, 'group');
		}

		// Named groups are only models for referencing elsewhere.

		if(!this.name && group) group.scope.addElementsToParent(this.scope);
//if(!group) console.log(ref)
	}

	name: string = null;
	ref: string = null;
}




// Attribute support

// <xsd:attribute>

export class XsdAttribute extends XsdBase {
	init(state: State) {
		if(this.name) this.scope.addToParent(new QName(this.name, state.stateStatic.source), 'attribute', this);
	}

	finish(state: State) {
		var attribute = this;

		if(this.ref) {
			// Replace this with another, referenced attribute.

			var ref = new QName(this.ref, state.stateStatic.source);
			attribute = this.scope.lookup(ref, 'attribute');
		}

		if(attribute) this.scope.addAttributeToParent(attribute);
//if(!attribute) console.log(ref)
	}

	id: string = null;
	name: string = null;
	ref: string = null;
	type: string = null;
	use: string = null;
	default: XmlAttribute = null;
}

// <xsd:attributegroup>

export class XsdAttributeGroup extends XsdBase {
	static mayContain = () => [
		XsdAttribute
	];

	init(state: State) {
		if(this.name) this.scope.addToParent(new QName(this.name, state.stateStatic.source), 'attributegroup', this);
	}

	finish(state: State) {
		var attributeGroup = this;

		if(this.ref) {
			var ref = new QName(this.ref, state.stateStatic.source);
			attributeGroup = this.scope.lookup(ref, 'attributegroup');
		}

		// Named attribute groups are only models for referencing elsewhere.
		//if(!attributeGroup) console.log(ref)

		if(!this.name && attributeGroup) {
			attributeGroup.scope.addAttributesToParent(this.scope);
		}
	}

	id: string = null;
	name: string = null;
	ref: string = null;
}




// Type support

export class XsdTypeBase extends XsdBase {
	init(state: State) {
		this.scope.addTypeToParent(this);
		if(this.name) this.scope.addToParent(new QName(this.name, state.stateStatic.source), 'type', this);
	}

	id: string = null;
	name: string = null;

	// Internally used members
	parent: XsdTypeBase | QName;
}

// <xsd:simpletype>

export class XsdSimpleType extends XsdTypeBase {
}

// <xsd:complextype>

export class XsdComplexType extends XsdTypeBase {
	static mayContain = () => [
		XsdSimpleContent,
		XsdComplexContent,
		XsdAttribute,
//		anyattribute,
		XsdSequence,
		XsdChoice,
		XsdAttributeGroup,
		XsdGroup
	];
}

export class XsdContentBase extends XsdBase {
	static mayContain = () => [
		XsdExtension,
		XsdRestriction
	]

	finish(state: State) {
		(state.parent.xsdElement as XsdTypeBase).parent = this.parent;
	}

	// Internally used members
	parent: XsdTypeBase | QName;
}

// <xsd:simplecontent>

export class XsdSimpleContent extends XsdContentBase {
}

// <xsd:complexcontent>

export class XsdComplexContent extends XsdContentBase {
}




// Derived type support

export class XsdDerivationBase extends XsdBase {
	finish(state: State) {
		var base = new QName(this.base, state.stateStatic.source);
		(state.parent.xsdElement as XsdContentBase).parent = this.scope.lookup(base, 'type') as XsdTypeBase || base;
	}

	id: string = null;
	base: string = null;
}

// <xsd:extension>

export class XsdExtension extends XsdDerivationBase {
}

// <xsd:restriction>

export class XsdRestriction extends XsdDerivationBase {
}




// <xsd:import>

export class XsdImport extends XsdBase {
	init(state: State) {
		if(this.schemaLocation) {
			// TODO: handle importing namespaces like http://www.w3.org/XML/1998/namespace
			// without a schemaLocation.

			// TODO: don't resolve URL here but instead inside addImport, calling targetNamespace.resolve!
			var urlRemote = url.resolve(state.stateStatic.source.targetNamespace.url, this.schemaLocation);
			state.stateStatic.addImport(Namespace.register(this.namespace, urlRemote), urlRemote);
		}
	}

	id: string = null;
	namespace: string = null;
	schemaLocation: string = null;
}

// <xsd:include>

export class XsdInclude extends XsdBase {
	init(state: State) {
		if(this.schemaLocation) {
			// TODO: don't resolve URL here but instead inside addImport, calling targetNamespace.resolve!
			var urlRemote = url.resolve(state.stateStatic.source.targetNamespace.url, this.schemaLocation);
			state.stateStatic.addImport(state.stateStatic.source.targetNamespace, urlRemote);
		}
	}

	id: string = null;
	schemaLocation: string = null;
}
