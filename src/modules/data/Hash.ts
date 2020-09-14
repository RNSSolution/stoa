/*******************************************************************************

    Includes classes and functions associated with hash.

    Copyright:
        Copyright (c) 2020 BOS Platform Foundation Korea
        All rights reserved.

    License:
        MIT License. See LICENSE for details.

*******************************************************************************/

import * as sodium from 'sodium-native';
import { readFromString, writeToString, Endian, reverse } from "../utils/buffer";
import * as assert from "assert";
import { SmartBuffer } from "smart-buffer";

/**
 * The Class for creating hash
 */
export class Hash
{
    /**
     * Buffer containing calculated hash values
     */
    public readonly data: Buffer;

    /**
     * The number of byte of the Hash
     */
    public static Width: number = 64;

    /**
     * The hash consisting of zero values for all bytes.
     * @returns The instance of Hash
     */
    static get NULL(): Hash
    {
        return new Hash();
    }

    /**
     * Constructor
     * @param bin The binary data of the hash
     * @param endian The byte order
     */
    constructor (bin?: Buffer, endian?: Endian)
    {
        this.data = Buffer.alloc(Hash.Width);
        if (bin != undefined)
            this.fromBinary(bin, endian);
    }

    /**
     * Reads from the hex string
     * @param hex The hex string
     * @param endian The byte order
     * @returns The instance of Hash
     */
    public fromString (hex: string, endian?: Endian): Hash
    {
        if (endian === undefined)
            endian = Endian.Little;

        readFromString(hex, this.data, endian);
        return this;
    }

    /**
     * Writes to the hex string
     * @param endian The byte order
     * @returns The hex string
     */
    public toString (endian?: Endian): string
    {
        if (endian === undefined)
            endian = Endian.Little;

        return writeToString(this.data, endian);
    }

    /**
     * Set binary data
     * @param bin The binary data of the hash
     * @param endian The byte order
     * @returns The instance of Hash
     */
    public fromBinary (bin: Buffer, endian?: Endian): Hash
    {
        assert.strictEqual(bin.length, Hash.Width);

        if (endian === undefined)
            endian = Endian.Big;

        if (endian === Endian.Little)
            reverse(bin, this.data);
        else
            bin.copy(this.data);

        return this;
    }

    /**
     * Get binary data
     * @param endian The byte order
     * @returns The binary data of the hash
     */
    public toBinary (endian?: Endian): Buffer
    {
        if (endian === undefined)
            endian = Endian.Big;

        if (endian === Endian.Little)
            return reverse(this.data);
        else
            return this.data;
    }

    /**
     * Creates from the hex string
     * @param hex The hex string
     * @param endian The byte order
     * @returns The instance of Hash
     */
    public static createFromString (hex: string, endian?: Endian): Hash
    {
        return (new Hash()).fromString(hex, endian);
    }

    /**
     * Creates from Buffer
     * @param bin The binary data of the hash
     * @param endian The byte order
     * @returns The instance of Hash
     */
    public static createFromBinary (bin: Buffer, endian?: Endian): Hash
    {
        return new Hash(bin, endian);
    }

    /**
     * Collects data to create a hash.
     * @param buffer - The buffer where collected data is stored
     */
    public computeHash (buffer: SmartBuffer)
    {
        buffer.writeBuffer(this.data);
    }
}

/**
 * Creates a hash and stores it in buffer.
 * @param source Original for creating hash
 * @returns Instance of Hash
 */
export function hash (source: Buffer): Hash
{
    let temp = Buffer.alloc(Hash.Width);
    sodium.crypto_generichash(temp, source);
    return new Hash(temp);
}

/**
 * Creates a hash of the two buffer combined.
 * @param source1 The original for creating hash
 * @param source2 The original for creating hash
 * @returns The instance of Hash
 * See_Also https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/common/Hash.d#L239-L255
 */
export function hashMulti (source1: Buffer, source2: Buffer): Hash
{
    let merge = Buffer.alloc(source1.length + source2.length);
    source1.copy(merge);
    source2.copy(merge, source1.length);

    let temp = Buffer.alloc(Hash.Width);
    sodium.crypto_generichash(temp, merge);
    return new Hash(temp);
}

/**
 * Makes a UTXOKey
 * @param h The instance of transaction's Hash
 * @param index The index of the output
 * @returns The instance of Hash
 * See_Also https://github.com/bpfkorea/agora/blob/93c31daa616e76011deee68a8645e1b86624ce3d/source/agora/consensus/data/UTXOSetValue.d#L50-L53
 */
export function makeUTXOKey (h: Hash, index: bigint): Hash
{
    let idx = Buffer.alloc(8);
    idx.writeBigUInt64LE(index);

    return hashMulti(h.data, idx);
}

/**
 * Serializes all internal objects that the instance contains in a buffer.
 * Calculates the hash of the buffer.
 * @param record The object to serialize for the hash for creation.
 * The object has a method named `computeHash`.
 * @returns The instance of the hash
 */
export function hashFull (record: any): Hash
{
    if ((record === null) || (record === undefined))
        return new Hash();

    let buffer = new SmartBuffer();
    hashPart(record, buffer);
    return hash(buffer.readBuffer());
}

/**
 * Serializes all internal objects that the instance contains in the buffer.
 * @param record The object to serialize for the hash for creation
 * @param buffer The storage of serialized data for creating the hash
 */
export function hashPart (record: any, buffer: SmartBuffer)
{
    if ((record === null) || (record === undefined))
        return;

    // If the record has a method called `computeHash`,
    if (typeof record["computeHash"] == "function")
    {
        record.computeHash(buffer);
        return;
    }

    if (Array.isArray(record))
    {
        for (let elem of record)
        {
            hashPart(elem, buffer);
        }
    }
    else
    {
        for (let key in record)
        {
            if (record.hasOwnProperty(key))
            {
                hashPart(record[key], buffer);
            }
        }
    }
}