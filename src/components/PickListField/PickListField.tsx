import React from 'react'
import PickInput from '../ui/PickInput/PickInput'
import { $do } from '../../actions/actions'
import { connect } from 'react-redux'
import { PickMap } from '../../interfaces/data'
import ReadOnlyField from '../ui/ReadOnlyField/ReadOnlyField'
import { ChangeDataItemPayload, BaseFieldProps } from '../Field/Field'
import { Store } from '../../interfaces/store'
import { buildBcUrl } from '../../utils/strings'

interface IPickListWidgetInputOwnProps extends BaseFieldProps {
    parentBCName: string
    bcName: string
    pickMap: PickMap
    value?: string
    placeholder?: string
}

interface IPickListWidgetInputProps extends IPickListWidgetInputOwnProps {
    onChange: (payload: ChangeDataItemPayload) => void
    onClick: (bcName: string, pickMap: PickMap) => void
    popupRowMetaDone: boolean
}

/**
 *
 * @param props
 * @category Components
 */
const PickListField: React.FunctionComponent<IPickListWidgetInputProps> = props => {
    if (props.readOnly) {
        return (
            <ReadOnlyField
                widgetName={props.widgetName}
                meta={props.meta}
                className={props.className}
                backgroundColor={props.backgroundColor}
                onDrillDown={props.onDrillDown}
            >
                {props.value}
            </ReadOnlyField>
        )
    }

    const handleClear = React.useCallback(() => {
        Object.keys(props.pickMap).forEach(field => {
            props.onChange({
                bcName: props.parentBCName,
                cursor: props.cursor,
                dataItem: { [field]: '' }
            })
        })
    }, [props.pickMap, props.onChange, props.parentBCName, props.cursor])

    const handleClick = React.useCallback(() => {
        props.onClick(props.bcName, props.pickMap)
    }, [props.onClick, props.bcName, props.pickMap])

    return (
        <PickInput
            disabled={props.disabled}
            value={props.value}
            onClick={handleClick}
            onClear={handleClear}
            placeholder={props.placeholder}
            loading={props.bcName && !props.popupRowMetaDone}
        />
    )
}

function mapStateToProps(store: Store, ownProps: IPickListWidgetInputOwnProps) {
    const popupBcName = ownProps?.bcName
    const bcUrl = buildBcUrl(popupBcName, true)
    const popupRowMetaDone = !!store.view.rowMeta[popupBcName]?.[bcUrl]?.fields

    return {
        popupRowMetaDone: popupRowMetaDone
    }
}

const mapDispatchToProps = (dispatch: any) => ({
    onChange: (payload: ChangeDataItemPayload) => {
        return dispatch($do.changeDataItem(payload))
    },
    onClick: (bcName: string, pickMap: PickMap) => {
        dispatch($do.showViewPopup({ bcName }))
        dispatch($do.viewPutPickMap({ map: pickMap, bcName }))
    }
})

/**
 * @category Components
 */
const ConnectedPickListField = connect(mapStateToProps, mapDispatchToProps)(PickListField)

export default ConnectedPickListField
