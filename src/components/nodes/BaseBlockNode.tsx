import React, { memo } from 'react';
import CloseButton from '../common/CloseButton';
import {
  getNodeDimensions,
  labelRowStyles,
  labelDisplayStyles,
  iconWrapperStyles,
  inputBaseStyles,
} from './blockNodeConstants';

export interface BaseBlockNodeLabelProps {
  label: string;
  isEditing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDoubleClick: () => void;
  handleBlur: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  displayLabel: string;
}

export interface BaseBlockNodeProps {
  id: string;
  selected: boolean;
  onRemove?: (id: string) => void;
  width?: number;
  height?: number;
  backgroundColor: string;
  borderColor: string;
  color: string;
  boxShadow: string;
  icon: React.ReactNode;
  headerBorderBottom: string;
  inputBackground: string;
  labelProps: BaseBlockNodeLabelProps;
  children?: React.ReactNode;
}

const BaseBlockNode: React.FC<BaseBlockNodeProps> = ({
  id,
  selected,
  onRemove,
  width,
  height,
  backgroundColor,
  borderColor,
  color,
  boxShadow,
  icon,
  headerBorderBottom,
  inputBackground,
  labelProps,
  children,
}) => {
  const { w, h } = getNodeDimensions(width, height);
  const {
    label,
    isEditing,
    inputRef,
    handleLabelChange,
    handleDoubleClick,
    handleBlur,
    handleKeyDown,
    displayLabel,
  } = labelProps;

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(id);
  };

  return (
    <div
      style={{
        width: w,
        height: h,
        minWidth: w,
        maxWidth: w,
        minHeight: 0,
        padding: '10px',
        borderRadius: '5px',
        backgroundColor,
        color,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        boxShadow,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <CloseButton onClick={handleRemoveClick} />
      <div style={{ ...labelRowStyles, borderBottom: headerBorderBottom }}>
        <div style={iconWrapperStyles}>{icon}</div>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={handleLabelChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              ...inputBaseStyles,
              background: inputBackground,
              color,
            }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={labelDisplayStyles}
          >
            {displayLabel}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export default memo(BaseBlockNode);
