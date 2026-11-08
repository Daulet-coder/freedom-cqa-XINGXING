import sys,gc

import torch

import torch.nn.functional as F

from torch.nn.attention import sdpa_kernel,SDPBackend

from transformers import AttentionInterface,AttentionMaskInterface

from transformers.masking_utils import sdpa_mask

def cqa_t4_attention(module,query,key,value,attention_mask,dropout=0.0,scaling=None,is_causal=None,**kwargs):
    if query.shape[1] % key.shape[1]: raise ValueError('Invalid grouped-query head ratio')
    repeats=query.shape[1]//key.shape[1]
    if repeats>1:
        key=key.repeat_interleave(repeats,dim=1)
        value=value.repeat_interleave(repeats,dim=1)
    causal=bool(query.shape[2]>1 and attention_mask is None and (getattr(module,'is_causal',True) if is_causal is None else is_causal))
    if causal and key.shape[2]>query.shape[2]:
        key=key[:,:,:query.shape[2],:];value=value[:,:,:query.shape[2],:]
    with sdpa_kernel(SDPBackend.EFFICIENT_ATTENTION):
        result=F.scaled_dot_product_attention(query.contiguous(),key.contiguous(),value.contiguous(),attn_mask=attention_mask,dropout_p=dropout,is_causal=causal,scale=scaling)
    return result.transpose(1,2).contiguous(),None

def install_t4_attention(model):
    device=model.get_input_embeddings().weight.device
    if device.type!='cuda' or torch.cuda.get_device_capability(device)[0]>=8:
        return {'changed':False,'backend':getattr(model.config,'_attn_implementation',None)}
    AttentionInterface.register('cqa_t4_sdpa',cqa_t4_attention)
    AttentionMaskInterface.register('cqa_t4_sdpa',sdpa_mask)
    model.set_attn_implementation('cqa_t4_sdpa')
    return {'changed':True,'backend':'cqa_t4_sdpa','reason':'Expand KV heads explicitly to avoid the GQA math fallback on T4; preserve causal/padding masks.'}

from torch.nn.attention import sdpa_kernel,SDPBackend

from types import SimpleNamespace
