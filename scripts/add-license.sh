#!/bin/bash
for file in $(ls ./contracts/*.sol ./test/*.test.js)
    do
    author="Exponent"
    year="2021"
    licenseBody="// Copyright (C) ${year} ${author}

// This file is part of Exponent.
    
// Exponent is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.
"

    grep -v "SPDX-License-Identifier: Unlicense" $file > temp && mv temp $file
   
    #add header
    if ! grep -q "// Copyright (C) " "$file"; then
        echo "$licenseBody" | cat - ${file} >temp && mv temp ${file}
    else
        sed -i.bak '1,17d' $file 
        rm -rf "$file.bak"
        echo "$licenseBody" | cat - ${file} >temp && mv temp ${file}
    fi
done