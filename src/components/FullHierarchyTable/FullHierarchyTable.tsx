import React, {FunctionComponent} from 'react'
import styles from './FullHierarchyTable.less'
import {WidgetListField, WidgetTableMeta} from '../../interfaces/widget'
import {AssociatedItem} from '../../interfaces/operation'
import {Store} from '../../interfaces/store'
import {Dispatch} from 'redux'
import {connect} from 'react-redux'
import {Button, Form, Icon, Input, Table} from 'antd'
import {ColumnProps, TableRowSelection, TableEventListeners} from 'antd/lib/table'
import {DataItem, MultivalueSingleValue, PendingDataItem} from '../../interfaces/data'
import {FieldType} from '../../interfaces/view'
import MultivalueHover from '../ui/Multivalue/MultivalueHover'
import Field from '../Field/Field'
import {useAssocRecords} from '../../hooks/useAssocRecords'
import {$do} from '../../actions/actions'
import {useTranslation} from 'react-i18next'
import filterIcon from '../ColumnTitle/filter-solid.svg'
import cn from 'classnames'
import {BcFilter, FilterType} from '../../interfaces/filters'
import {buildBcUrl} from '../..'

export interface FullHierarchyTableOwnProps {
    meta: WidgetTableMeta,
    assocValueKey?: string,
    depth?: number,
    parentId?: string,
    selectable?: boolean,
    searchPlaceholder?: string,
    expandedRowKeys?: string[],
    onRow?: (record: DataItem, index: number) => TableEventListeners
}

interface FullHierarchyTableProps {
    data: AssociatedItem[],
    loading: boolean,
    pendingChanges: Record<string, PendingDataItem>,
    bcFilter: BcFilter[],
    filterableFieldsKey: string[],
}

interface FullHierarchyTableDispatchProps {
    onSelect: (bcName: string, depth: number, dataItem: AssociatedItem, widgetName: string, assocValueKey: string) => void,
    onDeselectAll: (bcName: string, depthFrom: number) => void,
    onSelectAll: (bcName: string, parentId: string, depth: number, assocValueKey: string, selected: boolean) => void,
    addFilter: (bcName: string, filter: BcFilter) => void,
    removeFilter: (bcName: string, filter: BcFilter) => void,
}

interface FilterDropdownProps {
    confirm: () => void,
    clearFilters?: () => void,
    setSelectedKeys: (selectedKeys: React.Key[]) => void,
    selectedKeys: React.Key[],
}

export type FullHierarchyTableAllProps = FullHierarchyTableOwnProps & FullHierarchyTableProps & FullHierarchyTableDispatchProps

const emptyData: AssociatedItem[] = []
const emptyMultivalue: MultivalueSingleValue[] = []

const Exp: FunctionComponent = (props: any) => {
    if (!props.onExpand || props.record.noChildren) {
        return null
    }
    const type = props.expanded ? 'minus-square' : 'plus-square'
    return <Icon
        style={{ fontSize: '20px' }}
        type={type}
        onClick={e => props.onExpand(props.record, e)}
    />
}

export const FullHierarchyTable: React.FunctionComponent<FullHierarchyTableAllProps> = (props) => {
    const bcName = props.meta.bcName
    const fields = props.meta.fields
    const depthLevel = props.depth || 1
    const indentLevel = depthLevel - 1
    const {t} = useTranslation()
    const [userOpenedRecords, setUserOpenedRecords] = React.useState(props.expandedRowKeys || [])
    const [inputPlaceholder, setInputPlaceholder] = React.useState(props?.searchPlaceholder || '')

    // Apply one filter item
    const checkFiltered = (filter: BcFilter, checkData: AssociatedItem[]) => {
        const filteredData: AssociatedItem[] = []
        checkData?.forEach((dataItem) => {
            if (dataItem[filter?.fieldName]?.toString().toLowerCase().indexOf(filter?.value?.toString().toLowerCase()) > -1) {
                if (filter) {
                    dataItem._searched = true
                }
                filteredData.push(dataItem)
            }
        })
        return filteredData
    }

    // Function check tree to find all parent
    const findParent = (filteredData: AssociatedItem[], checkData: AssociatedItem[]) => {
        const parentData: AssociatedItem[] = []
        filteredData?.forEach((dataItem) => {
            let currentLevel = dataItem.level as number
            let currentParentId = dataItem.parentId as string
            while (currentLevel > 1) {
                const parentItem = props.data.find((item) => item.id === currentParentId)
                parentData.push(parentItem)
                currentParentId = parentItem.parentId as string
                currentLevel--
            }
        })
        return parentData
    }

    // Function check tree to find all child
    const findChild = (filteredData: AssociatedItem[], checkData: AssociatedItem[]) => {
        // BFS tree find algorithm
        const childs = []
        while (filteredData.length > 0) {
            const tempItem = filteredData.shift()
            childs.push(tempItem)
            const tmpChilds = props.data.filter(item => item.parentId === tempItem.id)
            if (tmpChilds.length > 0) {
                tmpChilds.forEach(child => filteredData.push(child))
            }
        }
        return childs
    }

    // Calculate dataItem with data with different filters
    const calcFiltered = (bcFilter: BcFilter[], checkData: AssociatedItem[]) => {
        let filtered: AssociatedItem[] = bcFilter?.[0] && checkData && checkFiltered(bcFilter[0], checkData) || []
        bcFilter?.forEach(filterItem => {
            const tmpFiltered = checkFiltered(filterItem, checkData)
            filtered = filtered.filter(item => tmpFiltered.includes(item))
        })
        return filtered
    }

    const findFiltered = calcFiltered(props.bcFilter, props.data)

    const hierarchyData = (items: AssociatedItem[], checkData: AssociatedItem[]) => {
        const parentItems = findParent(items, checkData)
        return Array.from(new Set([...items, ...parentItems, ...findChild(items, checkData)]))
    }

    const data = props?.bcFilter?.length > 0 && props?.data
        ? hierarchyData(findFiltered, props.data)
        : props?.data

    const {
        hierarchyGroupSelection,
        hierarchyGroupDeselection,
        hierarchyRadioAll,
        hierarchyRadio: hierarchyRootRadio,
        hierarchyDisableRoot
    } = props.meta.options ?? {}

    const selectedRecords = useAssocRecords(data, props.pendingChanges)

    const tableRecords = React.useMemo(
        () => {
            return data?.filter((dataItem) => {
                return dataItem.level === depthLevel && (dataItem.level === 1 || dataItem.parentId === props.parentId)
            })
                .map((filteredItem) => {
                    return {
                        ...filteredItem,
                        noChildren: !data.find((dataItem) => dataItem.parentId === filteredItem.id)
                    }
                })
        },
        [data, props.parentId, depthLevel]
    )

    const [preopenedRecordsInitiated, setPreopenedRecordsInitiated] = React.useState(false)
    const [preopenedRecordsInitiatedFilter, setPreopenedRecordsInitiatedFilter] = React.useState(false)
    const [preopenedRecordsInitiatedCancel, setPreopenedRecordsInitiatedCancel] = React.useState(false)

    if (!preopenedRecordsInitiated && !preopenedRecordsInitiatedCancel && !(props?.bcFilter?.length > 0) && data?.length) {
        setPreopenedRecordsInitiated(true)
        setUserOpenedRecords(selectedRecords
            .filter((selectedItem) => {
                const recordData = tableRecords.find((item) => item.id === selectedItem.id)
                return !recordData || !recordData.noChildren
            })
            .map((selectedItem) => selectedItem.id))
    } else if(!preopenedRecordsInitiatedFilter && !preopenedRecordsInitiatedCancel && props?.bcFilter?.length > 0 && data?.length) {
        setPreopenedRecordsInitiatedFilter(true)
        const filteredItems = calcFiltered(props.bcFilter, props.data)
        setUserOpenedRecords(Array.from(new Set([...filteredItems, ...findParent(filteredItems, props.data)]))
            .filter(item => data.find((dataItem) => dataItem.parentId === item.id)).map(item => item.id))
    } else if (preopenedRecordsInitiatedCancel) {
        setPreopenedRecordsInitiatedCancel(false)
        setUserOpenedRecords([])
    }

    const handleExpand = (expanded: boolean, dataItem: DataItem) => {
        if (expanded) {
            setUserOpenedRecords((prevState => [...prevState,dataItem.id]))
        } else {
            setUserOpenedRecords((prevState => prevState.filter(item => item !== dataItem.id)))
        }
    }

    const rowSelection: TableRowSelection<DataItem> = React.useMemo(() => {
        if (props.selectable) {
            return {
                type: 'checkbox',
                selectedRowKeys: selectedRecords.map(item => item.id),
                onSelect: (record: AssociatedItem, selected: boolean) => {
                    const dataItem = {
                        ...record,
                        _associate: selected,
                        _value: record[props.assocValueKey],
                    }

                    if (hierarchyRadioAll) {
                        props.onDeselectAll(bcName, depthLevel)
                    } else if (hierarchyRootRadio && depthLevel === 1 && selected) {
                        const rootSelectedRecord = selectedRecords.find((item) => item.level === 1)
                        if (rootSelectedRecord) {
                            props.onSelect(
                                bcName,
                                depthLevel,
                                { ...rootSelectedRecord, _associate: false },
                                props.meta.name,
                                props.assocValueKey
                            )
                        }
                    }

                    if (!selected && hierarchyGroupDeselection || selected && hierarchyGroupSelection) {
                        props.onSelectAll(bcName, record.id, depthLevel + 1, props.assocValueKey, selected)
                    }

                    props.onSelect(bcName, depthLevel, dataItem, props.meta.name, props.assocValueKey)
                }
            }
        }
        return undefined
    }, [bcName, props.onSelect, props.parentId, selectedRecords, props.assocValueKey, depthLevel, props.parentId])

    // Nested hierarchy level is drown by another table
    const nestedHierarchy = (record: DataItem, index: number, indent: number, expanded: boolean) => {
        return <ConnectedFullHierarchyTable
            meta={props.meta}
            assocValueKey={props.assocValueKey}
            depth={depthLevel + 1}
            parentId={record.id}
            selectable={props.selectable}
            onRow={props.onRow}
            expandedRowKeys={userOpenedRecords}
        />
    }

    // Hierarchy levels are indented by empty columns with calculated width
    const indentColumn = {
        title: '',
        key: '_indentColumn',
        dataIndex: null as string,
        className: styles.selectColumn,
        width: `${50 + indentLevel * 50}px`,
        render: (text: string, dataItem: AssociatedItem): React.ReactNode => {
            return null
        }
    }

    const handleCancel = (clearFilters: () => void, selectedKeys: React.Key[], filterKey: string) => {
        clearFilters()
        const bcFilter = {
            type: FilterType.contains,
            fieldName: filterKey,
            value: selectedKeys[0]
        }
        props.removeFilter(bcName, bcFilter)
        data?.filter(dataItem => dataItem._searched === true).forEach(dataItem => {dataItem._searched = false})
        setPreopenedRecordsInitiatedCancel(true)
    }

    const handleApply = (confirm: () => void, selectedKeys: React.Key[], filterKey: string) => {
        const searchString: string = selectedKeys[0] as string
        if (searchString?.length) {
            confirm()
            const bcFilter = {
                type: FilterType.contains,
                fieldName: filterKey,
                value: searchString
            }
            props.addFilter(bcName, bcFilter)
            data?.filter(dataItem => dataItem._searched === true).forEach(dataItem => {dataItem._searched = false})
            setPreopenedRecordsInitiatedFilter(false)
        } else {
            setInputPlaceholder(t('Enter value'))
        }
    }

    const dropDown = (filterableFieldsKey: string[], key: string) => {
        if (filterableFieldsKey?.indexOf(key) > -1) {
            return {
                filterDropdown: (dropdownProps: FilterDropdownProps) =>
                    <div className={styles.filterContent}>
                        <Form onSubmit={() => handleApply(
                            dropdownProps.confirm,
                            dropdownProps.selectedKeys,
                            key)} layout="vertical">
                            <Input
                                autoFocus
                                placeholder={inputPlaceholder}
                                value={dropdownProps.selectedKeys[0]}
                                suffix={<Icon type="search"/>}
                                onChange={(e) => {
                                    dropdownProps.setSelectedKeys(e.target.value ? [e.target.value] : [])
                                }}
                                maxLength={50}
                            />
                            <div className={styles.operators}>
                                <Button className={styles.button} htmlType="submit">
                                    {t('Apply')}
                                </Button>
                                <Button className={styles.button} onClick={() => handleCancel(
                                    dropdownProps.clearFilters,
                                    dropdownProps.selectedKeys,
                                    key)}>
                                    {t('Clear')}
                                </Button>
                            </div>
                        </Form>
                    </div>
                ,
                onFilterDropdownVisibleChange: (visible: boolean) => {
                    if (visible) {
                        setInputPlaceholder('')
                    }
                },
                filterIcon: <div
                    className={cn(styles.icon, {
                        [styles.active]: props?.bcFilter
                            ?.filter(filterItem => filterItem.fieldName === key)?.length > 0
                    })}
                    dangerouslySetInnerHTML={{__html: filterIcon}}
                />,
            }
        } else
            return {}
    }

    const columns: Array<ColumnProps<DataItem>> = React.useMemo(() => {
        return [
            indentColumn,
            ...fields
                .filter((item: WidgetListField) => item.type !== FieldType.hidden && !item.hidden)
                .map((item: WidgetListField) => ({
                    title: item.title,
                    key: item.key,
                    dataIndex: item.key,
                    ...dropDown(props.filterableFieldsKey, item.key),
                    render: (text: string, dataItem: AssociatedItem) => {
                        if (item.type === FieldType.multivalue) {
                            return <MultivalueHover
                                data={(dataItem[item.key] || emptyMultivalue) as MultivalueSingleValue[]}
                                displayedValue={item.displayedKey && dataItem[item.displayedKey]}
                            />
                        }
                        return <Field
                            bcName={bcName}
                            cursor={dataItem.id}
                            widgetName={props.meta.name}
                            widgetFieldMeta={item}
                            readonly
                        />
                    }
                }))
        ]
    }, [userOpenedRecords, inputPlaceholder, indentLevel, fields, props.meta.name, props.bcFilter])

    return <div className={styles.container}>
        <Table
            className={styles.table}
            rowSelection={rowSelection}
            rowKey="id"
            columns={columns}
            pagination={false}
            showHeader={depthLevel === 1}
            expandIcon={Exp as any}
            defaultExpandedRowKeys={undefined}
            expandedRowKeys={userOpenedRecords}
            onExpand={handleExpand}
            dataSource={tableRecords}
            expandedRowRender={nestedHierarchy}
            expandIconAsCell={false}
            expandIconColumnIndex={(props.selectable) ? 1 : 0}
            loading={props.loading}
            onRow={!(hierarchyDisableRoot && depthLevel === 1) && props.onRow}
        />
    </div>
}

function mapStateToProps(store: Store, ownProps: FullHierarchyTableOwnProps): FullHierarchyTableProps {
    const bcName = ownProps.meta.bcName
    const bc = store.screen.bo.bc[bcName]
    const bcUrl = buildBcUrl(bcName, true)
    const loading = bc?.loading
    const bcFilter = store.screen.filters[bcName]
    const filterableFieldsKey = store.view.rowMeta[bcName]?.[bcUrl]?.fields.filter(field => !!field.filterable).map(field => field.key)
    return {
        loading: loading,
        data: (loading) ? emptyData : store.data[bcName] as AssociatedItem[],
        pendingChanges: store.view.pendingDataChanges[bcName],
        bcFilter: bcFilter,
        filterableFieldsKey: filterableFieldsKey,
    }
}

function mapDispatchToProps(dispatch: Dispatch, ownProps: FullHierarchyTableOwnProps): FullHierarchyTableDispatchProps {
    return {
        onSelect: (bcName: string, depth: number, dataItem: AssociatedItem, widgetName: string, assocValueKey: string) => {
            dispatch($do.changeAssociationFull({ bcName, depth, widgetName: widgetName, dataItem, assocValueKey }))
        },
        onDeselectAll: (bcName: string, depthFrom: number) => {
            dispatch($do.dropAllAssociationsFull({ bcName, depth: depthFrom, dropDescendants: true }))
        },
        onSelectAll: (bcName: string, parentId: string, depth: number, assocValueKey: string, selected: boolean) => {
            dispatch($do.changeDescendantsAssociationsFull({ bcName, parentId, depth, assocValueKey, selected }))
        },
        addFilter: (bcName: string, filter: BcFilter) => {
            dispatch($do.bcAddFilter({ bcName, filter }))
        },
        removeFilter: (bcName: string, filter: BcFilter) => {
            dispatch($do.bcRemoveFilter({ bcName, filter }))
        }
    }
}

const ConnectedFullHierarchyTable = connect(mapStateToProps, mapDispatchToProps)(FullHierarchyTable)
export default ConnectedFullHierarchyTable
