/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('./data-table.css');

import { Ajax } from '../../../utils/ajax/ajax';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AttributeInfo, Attributes, findByName, Nameable } from 'plywood';

import { titleCase } from '../../../../common/utils/string/string';
import { pluralIfNeeded } from "../../../../common/utils/general/general";

import { STRINGS } from "../../../config/constants";

import { DataCube } from '../../../../common/models/index';

import { classNames } from '../../../utils/dom/dom';

import { SvgIcon, SimpleTable, SimpleTableColumn, Notifier } from '../../../components/index';
import { AttributeModal, SuggestionModal } from '../../../modals/index';

export interface DataTableProps extends React.Props<any> {
  dataCube?: DataCube;
  onChange?: (newDataCube: DataCube) => void;
}

export interface DataTableState {
  editedAttribute?: AttributeInfo;

  showSuggestionsModal?: boolean;
  attributeSuggestions?: Attributes;
}

export class DataTable extends React.Component<DataTableProps, DataTableState> {
  constructor() {
    super();

    this.state = {};
  }

  renderHeader(attribute: AttributeInfo, isPrimary: boolean, column: SimpleTableColumn, hovered: boolean): JSX.Element {
    const iconPath = `dim-${attribute.type.toLowerCase().replace('/', '-')}`;

    return <div
      className={classNames('header', {hover: hovered})}
      style={{width: column.width}}
      key={attribute.name}
    >
      <div className="cell name">
        <div className="label">{attribute.name}</div>
        <SvgIcon svg={require('../../../icons/full-edit.svg')}/>
      </div>
      <div className="cell type">
        <SvgIcon svg={require(`../../../icons/${iconPath}.svg`)}/>
        <div className="label">{titleCase(attribute.type) + (isPrimary ? ' (primary)' : '')}</div>
      </div>
    </div>;
  }

  onHeaderClick(column: SimpleTableColumn) {
    this.setState({
      editedAttribute: column.data
    });

    // Don't sort
    return false;
  }

  renderEditModal() {
    const { dataCube, onChange } = this.props;
    const { editedAttribute } = this.state;

    if (!editedAttribute) return null;

    const onClose = () => {
      this.setState({
        editedAttribute: null
      });
    };

    const onSave = (newAttribute: AttributeInfo) => {
      onChange(dataCube.updateAttribute(newAttribute));
      onClose();
    };

    return <AttributeModal
      attributeInfo={editedAttribute}
      onClose={onClose}
      onSave={onSave}
    />;
  }

  getColumns(): SimpleTableColumn[] {
    const dataCube = this.props.dataCube as DataCube;
    const primaryTimeAttribute = dataCube.getPrimaryTimeAttribute();

    return dataCube.attributes.map(a => {
      let isPrimary = a.name === primaryTimeAttribute;
      return {
        label: a.name,
        data: a,
        field: name,
        width: 170,
        render: this.renderHeader.bind(this, a, isPrimary)
      };
    });
  }

  onFiltersClick() {
    // TODO: do.
  }

  fetchSuggestions() {
    const { dataCube } = this.props;

    Ajax.query({
      method: "POST",
      url: 'settings/attributes',
      data: {
        clusterName: dataCube.clusterName,
        source: dataCube.source
      }
    })
      .then(
        (resp) => {
          this.setState({
            attributeSuggestions: dataCube.filterAttributes(AttributeInfo.fromJSs(resp.attributes))
          });
        },
        (xhr: XMLHttpRequest) => Notifier.failure('Woops', 'Something bad happened')
      )
      .done();
  }

  openSuggestionsModal() {
    this.setState({
      showSuggestionsModal: true
    }),

    this.fetchSuggestions();
  }

  closeAttributeSuggestions() {
    this.setState({
      attributeSuggestions: null,
      showSuggestionsModal: false
    });
  }

  renderAttributeSuggestions() {
    const { onChange, dataCube } = this.props;
    const { attributeSuggestions, showSuggestionsModal } = this.state;

    if (!showSuggestionsModal || !attributeSuggestions) return null;

    const getAttributeLabel = (a: AttributeInfo) => {
      var special = a.special ? ` [${a.special}]` : '';
      return `${a.name} as ${a.type}${special}`;
    };

    const onAdd = (extraAttributes: Attributes) => {
      onChange(dataCube.changeAttributes(dataCube.attributes.concat(extraAttributes)));
    };

    const AttributeSuggestionModal = SuggestionModal.specialize<AttributeInfo>();

    return <AttributeSuggestionModal
      onAdd={onAdd}
      onClose={this.closeAttributeSuggestions.bind(this)}
      getLabel={getAttributeLabel}
      options={attributeSuggestions}
      title={`${STRINGS.attribute} ${STRINGS.suggestions}`}

      okLabel={(n) => `${STRINGS.add} ${pluralIfNeeded(n, 'attribute')}`}
    />;
  }

  render() {
    // Obviously something more meaningful should be put in this array
    const rows: any[] = Array.apply(null, Array(10)).map(() => { return {}; });

    return <div className="data-table">
      <div className="actions">
        <button onClick={this.onFiltersClick.bind(this)}>{STRINGS.filters}</button>
        <button onClick={this.openSuggestionsModal.bind(this)}>{STRINGS.addAttributes}</button>
      </div>
      <SimpleTable
        columns={this.getColumns()}
        rows={rows}
        headerHeight={83}
        onHeaderClick={this.onHeaderClick.bind(this)}
      ></SimpleTable>
      { this.renderEditModal() }
      { this.renderAttributeSuggestions() }
    </div>;
  }
}
