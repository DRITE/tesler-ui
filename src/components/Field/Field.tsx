import React, { FunctionComponent } from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { Form, Icon, Input, Tooltip } from 'antd'
import { $do } from '../../actions/actions'
import { Store } from '../../interfaces/store'
import { DataItem, DataValue, MultivalueSingleValue, PendingDataItem } from '../../interfaces/data'
import { FieldType, PendingValidationFails, PendingValidationFailsFormat } from '../../interfaces/view'
import { RowMetaField } from '../../interfaces/rowMeta'
import { WidgetField, WidgetTypes, WidgetFieldBase } from '../../interfaces/widget'
import DatePickerField from '../ui/DatePickerField/DatePickerField'
import NumberInput from '../../components/ui/NumberInput/NumberInput'
import { NumberTypes } from '../ui/NumberInput/formaters'
import TextArea from '../../components/ui/TextArea/TextArea'
import Dictionary from '../../components/ui/Dictionary/Dictionary'
import { buildBcUrl } from '../../utils/strings'
import MultivalueField from '../Multivalue/MultivalueField'
import MultiField from '../ui/MultiField/MultiField'
import ReadOnlyField from '../ui/ReadOnlyField/ReadOnlyField'
import PickListField from '../PickListField/PickListField'
import InlinePickList from '../InlinePickList/InlinePickList'
import FileUpload from '../FileUpload/FileUpload'
import MultivalueHover from '../ui/Multivalue/MultivalueHover'
import cn from 'classnames'
import readOnlyFieldStyles from '../../components/ui/ReadOnlyField/ReadOnlyField.less'
import CheckboxPicker from '../../components/ui/CheckboxPicker/CheckboxPicker'
import RadioButton from '../../components/ui/RadioButton/RadioButton'
import styles from './Field.less'
import { CustomizationContext } from '../View/View'
import { InteractiveInput } from '../ui/InteractiveInput/InteractiveInput'
import HistoryField from '../../components/ui/HistoryField/HistoryField'
import { TooltipPlacement } from 'antd/es/tooltip'
import { useDrillDownUrl } from '../../hooks/useDrillDownUrl'

interface FieldOwnProps {
    widgetFieldMeta: WidgetField
    widgetName: string
    bcName: string
    cursor: string
    data?: DataItem
    className?: string
    suffixClassName?: string
    readonly?: boolean
    disableDrillDown?: boolean
    forceFocus?: boolean
    forcedValue?: DataValue
    historyMode?: boolean
    tooltipPlacement?: TooltipPlacement
    customProps?: Record<string, any>
    disableHoverError?: boolean
}

interface FieldProps extends FieldOwnProps {
    data: DataItem
    pendingValue: DataValue
    rowFieldMeta: RowMetaField
    metaError: string
    showErrorPopup: boolean
    onChange: (payload: ChangeDataItemPayload) => void
    onDrillDown: (widgetName: string, cursor: string, bcName: string, fieldKey: string) => void
}

/**
 * Basic set of properties passed to every field type, including custom fields
 */
export interface BaseFieldProps {
    /**
     * Id of currently selected data record
     */
    cursor?: string
    /**
     * Widget name
     */
    widgetName?: string
    /**
     * Field description in widget meta
     */
    meta?: WidgetFieldBase
    className?: string
    metaError?: string
    disabled?: boolean
    placeholder?: string
    readOnly?: boolean
    backgroundColor?: string
    onDrillDown?: () => void
}

export interface ChangeDataItemPayload {
    bcName: string
    cursor: string
    dataItem: PendingDataItem
}

export const emptyMultivalue: MultivalueSingleValue[] = []

const simpleDiffSupportedFieldTypes = [
    FieldType.input,
    FieldType.text,
    FieldType.hint,
    FieldType.number,
    FieldType.money,
    FieldType.percent,
    FieldType.date,
    FieldType.dateTime,
    FieldType.dateTimeWithSeconds,
    FieldType.checkbox,
    FieldType.pickList,
    FieldType.inlinePickList,
    FieldType.dictionary,
    FieldType.radio
]

const emptyFieldMeta = [] as any

/**
 *
 * @param props
 * @category Components
 */
export const Field: FunctionComponent<FieldProps> = props => {
    const [localValue, setLocalValue] = React.useState(null)
    let resultField: React.ReactChild = null
    const drillDownUrl = useDrillDownUrl(props.bcName, props.widgetFieldMeta, props.cursor)

    const value =
        'forcedValue' in props
            ? props.forcedValue
            : props.pendingValue !== undefined
            ? props.pendingValue
            : props.data?.[props.widgetFieldMeta.key]

    const disabled = props.rowFieldMeta ? props.rowFieldMeta.disabled : true

    const placeholder = props.rowFieldMeta?.placeholder

    const handleChange = React.useCallback(
        eventValue => {
            const dataItem = { [props.widgetFieldMeta.key]: eventValue }
            setLocalValue(null)
            props.onChange({ bcName: props.bcName, cursor: props.cursor, dataItem })
        },
        [props.bcName, props.cursor, props.widgetFieldMeta.key]
    )

    const handleInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(event.target.value)
    }, [])

    const bgColor = props.widgetFieldMeta.bgColorKey
        ? (props.data?.[props.widgetFieldMeta.bgColorKey] as string)
        : props.widgetFieldMeta.bgColor

    const handleDrilldown = React.useMemo(() => {
        return !props.disableDrillDown && drillDownUrl
            ? () => {
                  props.onDrillDown(props.widgetName, props.data?.id, props.bcName, props.widgetFieldMeta.key)
              }
            : null
    }, [props.disableDrillDown, drillDownUrl, props.widgetName, props.data?.id, props.bcName, props.widgetFieldMeta.key])

    const handleInputBlur = React.useCallback(() => {
        if (localValue != null) {
            handleChange(localValue)
        }
    }, [localValue, handleChange])

    const commonProps: BaseFieldProps = {
        cursor: props.cursor,
        widgetName: props.widgetName,
        meta: props.widgetFieldMeta,
        className: cn(props.className),
        metaError: props.metaError,
        disabled,
        placeholder,
        readOnly: props.readonly,
        backgroundColor: bgColor,
        onDrillDown: handleDrilldown
    }
    const commonInputProps: any = {
        cursor: props.cursor,
        meta: props.widgetFieldMeta,
        className: cn(props.className),
        disabled,
        placeholder,
        readOnly: props.readonly
    }

    Object.keys(commonProps).forEach(key => {
        if ((commonProps as Record<string, any>)[key] === undefined) {
            delete (commonProps as Record<string, any>)[key]
        }
    })

    Object.keys(commonInputProps).forEach(key => {
        if (commonInputProps[key] === undefined) {
            delete commonInputProps[key]
        }
    })

    if (!props.historyMode && props.widgetFieldMeta.snapshotKey && simpleDiffSupportedFieldTypes.includes(props.widgetFieldMeta.type)) {
        return (
            <HistoryField
                fieldMeta={props.widgetFieldMeta}
                data={props.data}
                bcName={props.bcName}
                cursor={props.cursor}
                widgetName={props.widgetName}
            />
        )
    }

    switch (props.widgetFieldMeta.type) {
        case FieldType.date:
        case FieldType.dateTime:
        case FieldType.dateTimeWithSeconds:
            resultField = (
                <DatePickerField
                    {...commonProps}
                    onChange={handleChange}
                    value={(value || '').toString()}
                    showTime={props.widgetFieldMeta.type === FieldType.dateTime}
                    showSeconds={props.widgetFieldMeta.type === FieldType.dateTimeWithSeconds}
                />
            )
            break
        case FieldType.number:
            resultField = (
                <NumberInput
                    {...commonProps}
                    value={value as number}
                    type={NumberTypes.number}
                    digits={props.widgetFieldMeta.digits}
                    nullable={props.widgetFieldMeta.nullable}
                    onChange={handleChange}
                    forceFocus={props.forceFocus}
                />
            )
            break
        case FieldType.money:
            resultField = (
                <NumberInput
                    {...commonProps}
                    value={value as number}
                    type={NumberTypes.money}
                    digits={props.widgetFieldMeta.digits}
                    nullable={props.widgetFieldMeta.nullable}
                    onChange={handleChange}
                    forceFocus={props.forceFocus}
                />
            )
            break
        case FieldType.percent:
            resultField = (
                <NumberInput
                    {...commonProps}
                    value={value as number}
                    type={NumberTypes.percent}
                    digits={props.widgetFieldMeta.digits}
                    nullable={props.widgetFieldMeta.nullable}
                    onChange={handleChange}
                    forceFocus={props.forceFocus}
                />
            )
            break
        case FieldType.dictionary:
            resultField = (
                <Dictionary
                    {...commonProps}
                    value={value as any}
                    values={props.rowFieldMeta ? props.rowFieldMeta.values : []}
                    fieldName={props.widgetFieldMeta.key}
                    onChange={handleChange}
                    multiple={props.widgetFieldMeta.multiple}
                />
            )
            break
        case FieldType.text:
            resultField = (
                <TextArea
                    {...commonProps}
                    maxInput={props.widgetFieldMeta.maxInput}
                    defaultValue={value as any}
                    onChange={handleChange}
                    className={cn({ [readOnlyFieldStyles.error]: props.metaError })}
                />
            )
            break
        case FieldType.multifield:
            resultField = (
                <MultiField
                    {...commonProps}
                    fields={props.widgetFieldMeta.fields}
                    data={props.data}
                    bcName={props.bcName}
                    cursor={props.cursor}
                    widgetName={props.widgetName}
                    style={props.widgetFieldMeta.style}
                />
            )
            break
        case FieldType.multivalue:
            resultField = (
                <MultivalueField
                    {...commonProps}
                    widgetName={props.widgetName}
                    defaultValue={Array.isArray(value) && value.length > 0 ? (value as MultivalueSingleValue[]) : emptyMultivalue}
                    widgetFieldMeta={props.widgetFieldMeta}
                    bcName={props.bcName}
                />
            )
            break
        case FieldType.pickList: {
            const pickListField = (
                <PickListField
                    {...commonProps}
                    parentBCName={props.bcName}
                    bcName={props.widgetFieldMeta.popupBcName}
                    cursor={props.cursor}
                    value={value as any}
                    pickMap={props.widgetFieldMeta.pickMap}
                />
            )
            resultField = props.readonly ? (
                pickListField
            ) : (
                <InteractiveInput suffix={handleDrilldown && <Icon type="link" />} onSuffixClick={handleDrilldown}>
                    {pickListField}
                </InteractiveInput>
            )
            break
        }
        case FieldType.inlinePickList: {
            const pickListField = (
                <InlinePickList
                    {...commonProps}
                    fieldName={props.widgetFieldMeta.key}
                    searchSpec={props.widgetFieldMeta.searchSpec}
                    bcName={props.bcName}
                    popupBcName={props.widgetFieldMeta.popupBcName}
                    cursor={props.cursor}
                    value={value as string}
                    pickMap={props.widgetFieldMeta.pickMap}
                />
            )
            resultField = props.readonly ? (
                pickListField
            ) : (
                <InteractiveInput suffix={handleDrilldown && <Icon type="link" />} onSuffixClick={handleDrilldown}>
                    {pickListField}
                </InteractiveInput>
            )
            break
        }
        case FieldType.checkbox:
            resultField = (
                <CheckboxPicker
                    {...commonProps}
                    fieldName={props.widgetFieldMeta.key}
                    fieldLabel={props.widgetFieldMeta.label}
                    value={value}
                    bcName={props.bcName}
                    cursor={props.cursor}
                    readonly={props.readonly}
                />
            )
            break
        case FieldType.fileUpload:
            resultField = (
                <FileUpload
                    {...commonProps}
                    fieldName={props.widgetFieldMeta.key}
                    bcName={props.bcName}
                    cursor={props.cursor}
                    fieldDataItem={props.data}
                    fieldValue={value as string}
                    fileIdKey={props.widgetFieldMeta.fileIdKey}
                    fileSource={props.widgetFieldMeta.fileSource}
                    snapshotKey={props.widgetFieldMeta.snapshotKey}
                    snapshotFileIdKey={props.widgetFieldMeta.snapshotFileIdKey}
                />
            )
            break
        case FieldType.multivalueHover:
            resultField = (
                <MultivalueHover
                    {...commonProps}
                    data={(value || emptyMultivalue) as MultivalueSingleValue[]}
                    displayedValue={props.widgetFieldMeta.displayedKey && props.data?.[props.widgetFieldMeta.displayedKey]}
                />
            )
            break
        case FieldType.hint:
            resultField = (
                <ReadOnlyField {...commonProps} className={cn(props.className, readOnlyFieldStyles.hint)}>
                    {value}
                </ReadOnlyField>
            )
            break
        case FieldType.radio:
            resultField = (
                <RadioButton
                    {...commonProps}
                    value={value as any}
                    values={props.rowFieldMeta?.values || emptyFieldMeta}
                    onChange={handleChange}
                />
            )
            break
        default:
            resultField = props.readonly ? (
                <ReadOnlyField {...commonProps}>{value}</ReadOnlyField>
            ) : (
                <InteractiveInput
                    suffixClassName={props.suffixClassName}
                    suffix={handleDrilldown && <Icon type="link" />}
                    onSuffixClick={handleDrilldown}
                >
                    <Input
                        {...commonInputProps}
                        value={localValue !== null ? localValue : value ? String(value) : ''}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        autoFocus={props.forceFocus}
                        maxLength={props.widgetFieldMeta.maxInput}
                    />
                </InteractiveInput>
            )
    }
    if (props.metaError && props.showErrorPopup) {
        return (
            <Tooltip
                placement={props.tooltipPlacement}
                overlayClassName={styles.error}
                title={props.metaError}
                getPopupContainer={trigger => trigger.parentElement}
            >
                <div>
                    <Form.Item validateStatus="error">{resultField}</Form.Item>
                </div>
            </Tooltip>
        )
    }
    return (
        <CustomizationContext.Consumer>
            {context => {
                const customFields = context.customFields
                if (customFields?.[props.widgetFieldMeta.type] || customFields?.[props.widgetFieldMeta.key]) {
                    const CustomComponent = customFields?.[props.widgetFieldMeta.type] || customFields?.[props.widgetFieldMeta.key]
                    return (
                        <CustomComponent
                            {...commonProps}
                            customProps={props.customProps}
                            value={value}
                            onBlur={handleInputBlur}
                            onChange={handleChange}
                        />
                    )
                }
                return resultField
            }}
        </CustomizationContext.Consumer>
    )
}

function mapStateToProps(store: Store, ownProps: FieldOwnProps) {
    const bcUrl = buildBcUrl(ownProps.bcName, true)
    const rowMeta = bcUrl && store.view.rowMeta[ownProps.bcName]?.[bcUrl]
    const rowFieldMeta = rowMeta?.fields.find(field => field.key === ownProps.widgetFieldMeta.key)
    const missing =
        store.view.pendingValidationFailsFormat === PendingValidationFailsFormat.target
            ? (store.view.pendingValidationFails as PendingValidationFails)?.[ownProps.bcName]?.[ownProps.cursor]?.[
                  ownProps.widgetFieldMeta.key
              ]
            : store.view.pendingValidationFails?.[ownProps.widgetFieldMeta.key]
    const metaError = missing || rowMeta?.errors?.[ownProps.widgetFieldMeta.key]
    const pendingValue = store.view.pendingDataChanges[ownProps.bcName]?.[ownProps.cursor]?.[ownProps.widgetFieldMeta.key]
    const widget = store.view.widgets.find(item => item.name === ownProps.widgetName)
    const showErrorPopup = widget?.type !== WidgetTypes.Form && !ownProps.disableHoverError
    return {
        data: ownProps.data || store.data[ownProps.bcName]?.find(item => item.id === ownProps.cursor),
        pendingValue,
        rowFieldMeta,
        metaError,
        showErrorPopup
    }
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        onChange: (payload: ChangeDataItemPayload) => {
            return dispatch($do.changeDataItem(payload))
        },
        onDrillDown: (widgetName: string, cursor: string, bcName: string, fieldKey: string) => {
            dispatch($do.userDrillDown({ widgetName, cursor, bcName, fieldKey }))
        }
    }
}
Field.displayName = 'Field'

/**
 * @category Components
 */
const ConnectedField = connect(mapStateToProps, mapDispatchToProps)(Field)

export default ConnectedField
