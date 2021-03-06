import React from 'react'
import { Icon, Popover } from 'antd'
import { DataValue, MultivalueSingleValue } from '../../../interfaces/data'
import styles from './MultivalueHover.less'
import cn from 'classnames'
import SearchHighlight from '../SearchHightlight/SearchHightlight'
import { escapedSrc } from '../../../utils/strings'
import { useWidgetHighlightFilter } from '../../../hooks/useWidgetFilter'
import { BaseFieldProps } from '../../Field/Field'

export interface MultivalueHoverProps extends BaseFieldProps {
    data: MultivalueSingleValue[]
    displayedValue: DataValue
    onDrillDown?: () => void
    className?: string
}

/**
 *
 * @param props
 * @category Components
 */
const Multivalue: React.FunctionComponent<MultivalueHoverProps> = props => {
    const filterKey = useWidgetHighlightFilter(props.widgetName, props.meta?.key)?.value?.toString()
    const filterValue = props.data?.find(bcDataItem => filterKey?.split(',')?.includes(bcDataItem.id))?.value.toString()
    const displayedItem =
        props.displayedValue !== undefined && props.displayedValue !== null ? (
            <p className={cn(styles.displayedValue, props.className)} onClick={props.onDrillDown}>
                {filterValue ? (
                    <SearchHighlight
                        source={(props.displayedValue || '').toString()}
                        search={escapedSrc(filterValue)}
                        match={formatString => <b>{formatString}</b>}
                    />
                ) : (
                    props.displayedValue
                )}
            </p>
        ) : (
            <Icon className={cn(props.className)} type="left-circle" onClick={props.onDrillDown} />
        )
    const fields = props.data.map((multivalueSingleValue, index) => {
        return (
            <div className={styles.multivalueFieldArea} key={index}>
                {multivalueSingleValue.options?.hint && <div className={styles.multivalueHint}>{multivalueSingleValue.options.hint}</div>}
                <div>{multivalueSingleValue.value}</div>
            </div>
        )
    })
    const content = <div className={styles.multivalueArea}>{fields}</div>
    return (
        <Popover content={content} trigger="hover" placement="topLeft">
            {displayedItem}
        </Popover>
    )
}

/**
 * @category Components
 */
const MemoizedMultivalue = React.memo(Multivalue)

export default MemoizedMultivalue
