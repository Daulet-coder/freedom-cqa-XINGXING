"""Strict, configurable CQA scoring without any model dependency."""
from decimal import Decimal, ROUND_HALF_UP
import math


def validate_rubric(rubric):
    if not isinstance(rubric, list) or not rubric:
        raise ValueError('Rubric must be a nonempty list')
    ids = [c['id'] for c in rubric]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate rubric IDs')
    for c in rubric:
        weight = c['weight']
        if type(weight) not in (int, float) or not math.isfinite(weight) or weight < 0:
            raise ValueError('Weight must be finite and nonnegative: ' + c['id'])
        if (c['id'] == 'critical' or c.get('is_critical', False)) and weight != 0:
            raise ValueError('Critical flags must have zero weight: ' + c['id'])
        choices = c['values']
        if not isinstance(choices, list) or not choices:
            raise ValueError('Missing scale: ' + c['id'])
        active = [v for v in choices if v is not None]
        if not active or any(type(v) not in (bool, int, float) for v in active):
            raise ValueError('Invalid scale: ' + c['id'])
        if (c['id'] == 'critical' or c.get('is_critical', False)) and (any(type(v) is not bool for v in active) or None in choices):
            raise ValueError('Critical flags require boolean values without N/A: ' + c['id'])
        if any(type(v) is bool for v in active):
            if not all(type(v) is bool for v in active):
                raise ValueError('Mixed boolean/numeric scale: ' + c['id'])
        elif any(not math.isfinite(v) or v < 0 for v in active) or max(active) <= 0:
            raise ValueError('Numeric scale must have a positive maximum: ' + c['id'])
    return rubric


def score_with_breakdown(criteria, rubric):
    validate_rubric(rubric)
    if not isinstance(criteria, list) or len(criteria) != len(rubric):
        raise ValueError('Exactly one value per rubric criterion required')
    values = {c['criterion_id']: c['value'] for c in criteria}
    if len(values) != len(criteria) or set(values) != {c['id'] for c in rubric}:
        raise ValueError('Criterion IDs mismatch')
    earned = Decimal(0)
    applicable = Decimal(0)
    details = []
    for c in rubric:
        value = values[c['id']]
        if not any((type(value) is type(v) or (type(value) in (int,float) and type(v) in (int,float))) and value == v for v in c['values']):
            raise ValueError('Invalid typed value: ' + c['id'])
        weight = Decimal(str(c['weight']))
        fraction = Decimal(0)
        if value is not None and weight:
            applicable += weight
            if type(value) is bool:
                fraction = Decimal(int(value))
            else:
                maximum = max(v for v in c['values'] if type(v) in (int, float))
                fraction = Decimal(str(value)) / Decimal(str(maximum))
            earned += weight * fraction
        details.append({'criterion_id': c['id'], 'value': value, 'weight': c['weight'],
                        'applicable': value is not None and bool(weight),
                        'weighted_points': float(weight * fraction)})
    final = None if not applicable else float((100 * earned / applicable).quantize(
        Decimal('0.01'), rounding=ROUND_HALF_UP))
    return {'final_score': final, 'critical_flag': any(values[c['id']] is True for c in rubric if c['id'] == 'critical' or c.get('is_critical', False))}, {
        'earned': float(earned), 'applicable_weight': float(applicable), 'criteria': details}


def calculate_score(criteria, rubric):
    return score_with_breakdown(criteria, rubric)[0]
